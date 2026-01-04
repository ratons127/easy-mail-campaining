alter table policy_settings
  add column if not exists notification_smtp_account_id bigint,
  add column if not exists notification_sender_identity_id bigint;
