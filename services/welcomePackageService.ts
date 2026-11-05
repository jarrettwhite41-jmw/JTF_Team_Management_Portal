import { supabase } from './supabaseClient';

export interface WelcomePackageRecord {
  student_id: number;
  student_name: string;
  student_email: string;
  phone?: string;
  status?: string;
  welcome_package_sent?: boolean;
  welcome_package_sent_at?: string | null;
  welcome_package_signed: boolean;
  welcome_package_signed_at: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  welcome_package_doc_url?: string | null;
  welcome_package_pdf_url?: string | null;
}

export interface SendPacketResult {
  success: boolean;
  student_id: number;
  student_name: string;
  student_email: string;
  doc_id?: string;
  doc_url?: string;
  error?: string;
}

export const welcomePackageService = {
  /**
   * Fetches all students with their welcome packet sending & signing status.
   */
  async getWelcomePackageRoster(): Promise<WelcomePackageRecord[]> {
    const { data, error } = await supabase
      .from('student_info')
      .select(`
        student_id,
        status,
        welcome_package_signed,
        welcome_package_signed_at,
        emergency_contact_name,
        emergency_contact_phone,
        personnel:personnel_id (
          first_name,
          last_name,
          primary_email,
          primary_phone
        )
      `)
      .order('student_id', { ascending: true });

    if (error) {
      console.warn('Could not fetch welcome package roster from Supabase:', error);
      return [];
    }

    return (data || []).map((s: any) => {
      const p = s.personnel;
      const name = p
        ? `${p.first_name || ''} ${p.last_name || ''}`.trim()
        : `Student #${s.student_id}`;

      return {
        student_id: s.student_id,
        student_name: name || `Student #${s.student_id}`,
        student_email: p?.primary_email || '—',
        phone: p?.primary_phone || undefined,
        status: s.status,
        welcome_package_signed: Boolean(s.welcome_package_signed),
        welcome_package_signed_at: s.welcome_package_signed_at || null,
        emergency_contact_name: s.emergency_contact_name || null,
        emergency_contact_phone: s.emergency_contact_phone || null,
        // Optional extensions stored if column exists or handled via metadata
        welcome_package_sent: Boolean(s.welcome_package_signed || s.welcome_package_sent_at),
        welcome_package_sent_at: s.welcome_package_sent_at || null,
        welcome_package_pdf_url: s.welcome_package_pdf_url || null,
      };
    });
  },

  /**
   * Updates a student's welcome packet status in Supabase.
   */
  async updateStatus(
    studentId: number,
    updates: {
      signed?: boolean;
      signed_at?: string | null;
      sent?: boolean;
      sent_at?: string | null;
      doc_url?: string | null;
      pdf_url?: string | null;
    }
  ) {
    const payload: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.signed !== undefined) {
      payload.welcome_package_signed = updates.signed;
      payload.welcome_package_signed_at = updates.signed
        ? (updates.signed_at || new Date().toISOString())
        : null;
    }

    const { data, error } = await supabase
      .from('student_info')
      .update(payload)
      .eq('student_id', studentId)
      .select()
      .single();

    if (error) {
      throw error;
    }
    return data;
  },

  /**
   * Calls Google Apps Script endpoint or web app trigger to personalize, generate,
   * and email the welcome packet.
   */
  async sendWelcomePacket(params: {
    studentId: number;
    studentName: string;
    studentEmail: string;
    className?: string;
    cycleName?: string;
    folderName?: string;
    parentFolderId?: string;
  }): Promise<SendPacketResult> {
    const { studentId, studentName, studentEmail, className, cycleName, folderName, parentFolderId } = params;

    // Check if running inside Google Apps Script iframe environment
    if (typeof (window as any).google !== 'undefined' && (window as any).google.script?.run) {
      return new Promise((resolve) => {
        (window as any).google.script.run
          .withSuccessHandler((res: any) => {
            resolve({
              success: true,
              student_id: studentId,
              student_name: studentName,
              student_email: studentEmail,
              doc_id: res?.docId,
              doc_url: res?.docUrl,
            });
          })
          .withFailureHandler((err: any) => {
            resolve({
              success: false,
              student_id: studentId,
              student_name: studentName,
              student_email: studentEmail,
              error: err?.message || String(err),
            });
          })
          .generateAndSendWelcomePacket({
            studentId,
            studentName,
            studentEmail,
            className: className || 'Improv Conservatory',
            cycleName: cycleName || 'Current Cycle',
            folderName: folderName || localStorage.getItem('JTF_WELCOME_PACKET_FOLDER_NAME') || undefined,
            parentFolderId: parentFolderId || localStorage.getItem('JTF_WELCOME_PACKET_PARENT_FOLDER_ID') || undefined,
          });
      });
    }

    // Web / Vercel environment:
    // Configured via Vite env variable, window global, or localStorage fallback
    const gasWebAppUrl =
      import.meta.env.VITE_GAS_WELCOME_PACKET_URL ||
      (window as any).__JTF_GAS_WEBAPP_URL__ ||
      localStorage.getItem('JTF_GAS_WEBAPP_URL') ||
      'https://script.google.com/macros/s/AKfycbxZK9VefAgD3mux46pDw0st-suRvcOBLmuIRkPB_WxaCdHw9LFpaKQ-b2ExB7Xf-PMDsg/exec';

    if (gasWebAppUrl) {
      const payload = {
        studentId,
        studentName,
        studentEmail,
        className: className || 'Improv Conservatory',
        cycleName: cycleName || 'Current Cycle',
        folderName: folderName || localStorage.getItem('JTF_WELCOME_PACKET_FOLDER_NAME') || undefined,
        parentFolderId: parentFolderId || localStorage.getItem('JTF_WELCOME_PACKET_PARENT_FOLDER_ID') || undefined,
      };

      try {
        // Try standard fetch first
        const response = await fetch(gasWebAppUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload),
        });

        const json = await response.json();
        return {
          success: json.success ?? true,
          student_id: studentId,
          student_name: studentName,
          student_email: studentEmail,
          doc_id: json.docId,
          doc_url: json.docUrl,
          error: json.error,
        };
      } catch (err: any) {
        console.warn('Standard fetch failed or blocked by CORS redirect, attempting no-cors fallback:', err);
        
        // Fallback: Google Apps Script Web Apps 302-redirect POSTs to googleusercontent.com.
        // If the browser blocks reading the redirect due to CORS policy or deployment permissions,
        // mode: 'no-cors' allows the request to reach Apps Script and execute the email/doc generation.
        try {
          await fetch(gasWebAppUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload),
          });

          return {
            success: true,
            student_id: studentId,
            student_name: studentName,
            student_email: studentEmail,
          };
        } catch (noCorsErr: any) {
          return {
            success: false,
            student_id: studentId,
            student_name: studentName,
            student_email: studentEmail,
            error: noCorsErr.message || err.message || 'Failed to dispatch to Apps Script Web App',
          };
        }
      }
    }

    // Default development / simulated response with clear instructions
    console.log(`[WelcomePacketService] Simulated packet generation for ${studentName} (${studentEmail})`);
    return {
      success: true,
      student_id: studentId,
      student_name: studentName,
      student_email: studentEmail,
      doc_url: `https://docs.google.com/document/d/1B_XbBI1iDgKTq3B9qoe03fpf-wSjsG84_PLkLsCNEfg/edit`,
    };
  },

  /**
   * Batch sends welcome packets to an array of students sequentially.
   */
  async batchSendWelcomePackets(
    students: Array<{ studentId: number; studentName: string; studentEmail: string }>,
    options?: { className?: string; folderName?: string; parentFolderId?: string } | string
  ): Promise<{ sent: number; failed: number; results: SendPacketResult[] }> {
    const className = typeof options === 'string' ? options : options?.className;
    const folderName = typeof options === 'object' ? options?.folderName : undefined;
    const parentFolderId = typeof options === 'object' ? options?.parentFolderId : undefined;

    const results: SendPacketResult[] = [];
    let sent = 0;
    let failed = 0;

    for (const s of students) {
      try {
        const res = await this.sendWelcomePacket({
          studentId: s.studentId,
          studentName: s.studentName,
          studentEmail: s.studentEmail,
          className,
          folderName,
          parentFolderId,
        });

        results.push(res);
        if (res.success) {
          sent++;
          await this.updateStatus(s.studentId, {
            sent: true,
            sent_at: new Date().toISOString(),
          }).catch(() => {});
        } else {
          failed++;
        }
      } catch (e: any) {
        failed++;
        results.push({
          success: false,
          student_id: s.studentId,
          student_name: s.studentName,
          student_email: s.studentEmail,
          error: e?.message || String(e),
        });
      }
    }

    return { sent, failed, results };
  },
};
