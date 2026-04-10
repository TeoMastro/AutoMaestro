-- Add n8n instance credentials to companies
alter table public.companies add column n8n_instance_url text null;
alter table public.companies add column n8n_instance_username text null;
alter table public.companies add column n8n_instance_password text null;
