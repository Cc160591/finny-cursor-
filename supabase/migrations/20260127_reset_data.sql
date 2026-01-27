-- Migration: Reset application data
-- This will delete all data from application tables while keeping auth users intact.

truncate table 
  public.chat_messages, 
  public.transactions, 
  public.insights, 
  public.profiles, 
  public.accounts 
restart identity cascade;

-- Note: profiles will be recreated automatically on next login via trigger if they were deleted.
