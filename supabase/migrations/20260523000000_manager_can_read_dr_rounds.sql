-- Managers need SELECT access to their direct reports' assessment_rounds so the
-- manager scoring page can fetch the round via the standard server client.
-- The existing "Users can manage own rounds" policy only covers auth.uid() = user_id.
-- This mirrors the "Managers can read scores for direct reports" policy on scores.
create policy "Managers can read direct report rounds" on assessment_rounds
  for select using (
    exists (
      select 1 from connections
      where connections.direct_report_id = assessment_rounds.user_id
        and connections.manager_id = auth.uid()
        and connections.status = 'active'
    )
  );
