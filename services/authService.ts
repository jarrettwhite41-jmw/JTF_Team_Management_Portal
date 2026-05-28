import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { PortalAccessRole } from '../types';
import { supabase } from './supabaseClient';

interface PortalAccessRow {
  portal_role: PortalAccessRole;
  is_active: boolean;
  personnel_id?: number | null;
}

interface RoleLookupResult {
  success: boolean;
  role: PortalAccessRole | null;
  personnelId: number | null;
  error?: string;
}

class AuthService {
  async getCurrentUser() {
    const { data } = await supabase.auth.getUser();
    return data.user ?? null;
  }

  async signIn(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  async signOut() {
    await supabase.auth.signOut();
  }

  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }

  async getTeamPortalRole(authUserId: string, email?: string | null): Promise<RoleLookupResult> {
    const direct = await supabase
      .from('portal_user_access')
      .select('portal_role,is_active,personnel_id')
      .eq('portal_name', 'team')
      .eq('auth_user_id', authUserId)
      .maybeSingle<PortalAccessRow>();

    if (direct.error) {
      return { success: false, role: null, personnelId: null, error: direct.error.message };
    }

    if (direct.data?.is_active) {
      return {
        success: true,
        role: direct.data.portal_role,
        personnelId: direct.data.personnel_id ?? null,
      };
    }

    if (!email) {
      return { success: false, role: null, personnelId: null, error: 'No active Team portal access found.' };
    }

    const emailLookup = await supabase
      .from('portal_user_access')
      .select('portal_role,is_active,personnel_id')
      .eq('portal_name', 'team')
      .eq('login_email', email.trim().toLowerCase())
      .maybeSingle<PortalAccessRow>();

    if (emailLookup.error) {
      return { success: false, role: null, personnelId: null, error: emailLookup.error.message };
    }

    if (!emailLookup.data || !emailLookup.data.is_active) {
      return { success: false, role: null, personnelId: null, error: 'No active Team portal access found.' };
    }

    await supabase
      .from('portal_user_access')
      .update({ auth_user_id: authUserId })
      .eq('portal_name', 'team')
      .eq('login_email', email.trim().toLowerCase());

    return {
      success: true,
      role: emailLookup.data.portal_role,
      personnelId: emailLookup.data.personnel_id ?? null,
    };
  }
}

export const authService = new AuthService();
