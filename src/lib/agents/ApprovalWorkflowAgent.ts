// 승인 워크플로우 Agent
// 문항 승인 프로세스 관리

import { createClient } from '@/lib/supabase/server';
import type { WorkflowAction, WorkflowHistoryEntry } from './types';

export class ApprovalWorkflowAgent {
  private supabase: Awaited<ReturnType<typeof createClient>> | null = null;

  async initialize() {
    this.supabase = await createClient();
  }

  /**
   * 문항 검토
   */
  async reviewItem(
    itemId: string,
    userId: string,
    notes?: string,
    qualityScore?: number
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.supabase) await this.initialize();

    try {
      // 문항 상태 업데이트
      const { error: updateError } = await this.supabase!
        .from('generated_test_items')
        .update({
          status: 'reviewed',
          reviewed_by: userId,
          review_notes: notes || null
        })
        .eq('id', itemId);

      if (updateError) {
        throw new Error(`문항 업데이트 오류: ${updateError.message}`);
      }

      // 워크플로우 이력 추가
      await this.addWorkflowHistory(itemId, 'review', userId, notes, qualityScore);

      return { success: true };
    } catch (error) {
      console.error('문항 검토 오류:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      };
    }
  }

  /**
   * 문항 승인
   */
  async approveItem(
    itemId: string,
    userId: string,
    notes?: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.supabase) await this.initialize();

    try {
      // 문항 상태 업데이트
      const { error: updateError } = await this.supabase!
        .from('generated_test_items')
        .update({
          status: 'approved',
          reviewed_by: userId,
          review_notes: notes || null,
          approved_at: new Date().toISOString()
        })
        .eq('id', itemId);

      if (updateError) {
        throw new Error(`문항 업데이트 오류: ${updateError.message}`);
      }

      // 현재 품질 점수 조회
      const { data: item } = await this.supabase!
        .from('generated_test_items')
        .select('quality_score')
        .eq('id', itemId)
        .single();

      // 워크플로우 이력 추가
      await this.addWorkflowHistory(
        itemId,
        'approve',
        userId,
        notes,
        item?.quality_score || null
      );

      return { success: true };
    } catch (error) {
      console.error('문항 승인 오류:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      };
    }
  }

  /**
   * 문항 거부
   */
  async rejectItem(
    itemId: string,
    userId: string,
    notes: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.supabase) await this.initialize();

    try {
      // 문항 상태 업데이트
      const { error: updateError } = await this.supabase!
        .from('generated_test_items')
        .update({
          status: 'rejected',
          reviewed_by: userId,
          review_notes: notes
        })
        .eq('id', itemId);

      if (updateError) {
        throw new Error(`문항 업데이트 오류: ${updateError.message}`);
      }

      // 현재 품질 점수 조회
      const { data: item } = await this.supabase!
        .from('generated_test_items')
        .select('quality_score')
        .eq('id', itemId)
        .single();

      // 워크플로우 이력 추가
      await this.addWorkflowHistory(
        itemId,
        'reject',
        userId,
        notes,
        item?.quality_score || null
      );

      return { success: true };
    } catch (error) {
      console.error('문항 거부 오류:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      };
    }
  }

  /**
   * 워크플로우 이력 조회
   */
  async getWorkflowHistory(itemId: string): Promise<WorkflowHistoryEntry[]> {
    if (!this.supabase) await this.initialize();

    try {
      const { data, error } = await this.supabase!
        .from('item_approval_workflow')
        .select('*')
        .eq('item_id', itemId)
        .order('created_at', { ascending: true });

      if (error) {
        throw new Error(`이력 조회 오류: ${error.message}`);
      }

      return (data || []).map(entry => ({
        id: entry.id,
        item_id: entry.item_id,
        action: entry.action as WorkflowAction,
        performed_by: entry.performed_by,
        notes: entry.notes || undefined,
        quality_score: entry.quality_score || undefined,
        created_at: new Date(entry.created_at)
      }));
    } catch (error) {
      console.error('워크플로우 이력 조회 오류:', error);
      return [];
    }
  }

  /**
   * 워크플로우 이력 추가
   */
  private async addWorkflowHistory(
    itemId: string,
    action: WorkflowAction,
    performedBy: string,
    notes?: string,
    qualityScore?: number | null
  ): Promise<void> {
    if (!this.supabase) await this.initialize();

    const { error } = await this.supabase!
      .from('item_approval_workflow')
      .insert({
        item_id: itemId,
        action,
        performed_by: performedBy,
        notes: notes || null,
        quality_score: qualityScore || null
      });

    if (error) {
      throw new Error(`워크플로우 이력 추가 오류: ${error.message}`);
    }
  }
}

