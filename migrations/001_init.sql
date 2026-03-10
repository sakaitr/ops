PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('personel','yetkili','yonetici','admin')),
  department_id TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (department_id) REFERENCES departments(id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS config_categories (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('worklog','ticket')),
  name TEXT NOT NULL,
  color TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(type, name)
);

CREATE TABLE IF NOT EXISTS config_tags (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('worklog','ticket','todo')),
  name TEXT NOT NULL,
  color TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(type, name)
);

CREATE TABLE IF NOT EXISTS config_priorities (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('ticket','todo')),
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(type, code)
);

CREATE TABLE IF NOT EXISTS config_ticket_statuses (
  code TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_terminal INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS config_worklog_statuses (
  code TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_terminal INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS config_sla_rules (
  id TEXT PRIMARY KEY,
  priority_code TEXT NOT NULL,
  due_minutes INTEGER NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(priority_code)
);

CREATE TABLE IF NOT EXISTS todo_templates (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  role_target TEXT CHECK (role_target IN ('personel','yetkili','yonetici','admin')),
  department_id TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (department_id) REFERENCES departments(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS worklogs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  work_date TEXT NOT NULL,
  summary TEXT NOT NULL,
  status_code TEXT NOT NULL CHECK (status_code IN ('draft','submitted','returned','approved')),
  submitted_at TEXT,
  returned_at TEXT,
  approved_at TEXT,
  manager_note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(user_id, work_date)
);

CREATE TABLE IF NOT EXISTS worklog_items (
  id TEXT PRIMARY KEY,
  worklog_id TEXT NOT NULL,
  title TEXT NOT NULL,
  category_id TEXT,
  duration_minutes INTEGER,
  tag_ids TEXT,
  linked_todo_id TEXT,
  linked_ticket_id TEXT,
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (worklog_id) REFERENCES worklogs(id),
  FOREIGN KEY (category_id) REFERENCES config_categories(id),
  FOREIGN KEY (linked_todo_id) REFERENCES todos(id),
  FOREIGN KEY (linked_ticket_id) REFERENCES tickets(id)
);

CREATE TABLE IF NOT EXISTS todos (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status_code TEXT NOT NULL CHECK (status_code IN ('todo','doing','blocked','done')),
  priority_code TEXT,
  assigned_to TEXT,
  created_by TEXT NOT NULL,
  department_id TEXT,
  due_date TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (assigned_to) REFERENCES users(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (department_id) REFERENCES departments(id)
);

CREATE TABLE IF NOT EXISTS todo_comments (
  id TEXT PRIMARY KEY,
  todo_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  comment TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (todo_id) REFERENCES todos(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  ticket_no TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  category_id TEXT,
  priority_code TEXT,
  status_code TEXT NOT NULL CHECK (status_code IN ('open','in_progress','waiting','solved','closed')),
  tag_ids TEXT,
  sla_due_at TEXT,
  created_by TEXT NOT NULL,
  assigned_to TEXT,
  department_id TEXT,
  solved_at TEXT,
  closed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (category_id) REFERENCES config_categories(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (assigned_to) REFERENCES users(id),
  FOREIGN KEY (department_id) REFERENCES departments(id)
);

CREATE TABLE IF NOT EXISTS ticket_comments (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  comment TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS ticket_actions (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL,
  title TEXT NOT NULL,
  is_done INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  completed_at TEXT,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (actor_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_worklogs_user_date ON worklogs(user_id, work_date);
CREATE INDEX IF NOT EXISTS idx_worklogs_status ON worklogs(status_code);
CREATE INDEX IF NOT EXISTS idx_worklog_items_worklog ON worklog_items(worklog_id);
CREATE INDEX IF NOT EXISTS idx_todos_assigned ON todos(assigned_to);
CREATE INDEX IF NOT EXISTS idx_todos_status ON todos(status_code);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned ON tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status_code);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket ON ticket_comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_todo_comments_todo ON todo_comments(todo_id);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_log(actor_user_id);
