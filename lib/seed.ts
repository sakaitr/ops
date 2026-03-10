import { v4 as uuidv4 } from "uuid";
import type Database from "better-sqlite3";
import { hashPassword } from "./auth";
import { nowIso } from "./time";

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

export function seedDatabase(db: Database.Database) {
  const now = nowIso();
  const yesterdayIso = daysAgo(1);
  const todayDate    = daysAgo(0);
  const tomorrowIso  = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; })();

  // ── Prepared statements ──────────────────────────────────────────────────
  const insertDepartment  = db.prepare("INSERT OR IGNORE INTO departments (id, name, is_active, created_at, updated_at) VALUES (?, ?, 1, ?, ?)");
  const insertTicketStatus = db.prepare("INSERT OR IGNORE INTO config_ticket_statuses  (code, label, sort_order, is_terminal, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)");
  const insertWorklogStatus= db.prepare("INSERT OR IGNORE INTO config_worklog_statuses (code, label, sort_order, is_terminal, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)");
  const insertPriority     = db.prepare("INSERT OR IGNORE INTO config_priorities (id, type, code, label, sort_order, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)");
  const insertSlaRule      = db.prepare("INSERT OR IGNORE INTO config_sla_rules  (id, priority_code, due_minutes, is_active, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)");
  const insertCategory     = db.prepare("INSERT OR IGNORE INTO config_categories (id, type, name, color, is_active, created_at, updated_at) VALUES (?, ?, ?, NULL, 1, ?, ?)");
  const insertTag          = db.prepare("INSERT OR IGNORE INTO config_tags       (id, type, name, color, is_active, created_at, updated_at) VALUES (?, ?, ?, NULL, 1, ?, ?)");

  const tx = db.transaction(() => {

    // ── Departments ──────────────────────────────────────────────────────────
    const departments: Record<string, string> = {};
    const deptNames = [
      { key: "Genel",   name: "Genel"      },
      { key: "IT",      name: "IT"         },
      { key: "Support", name: "Destek"     },
      { key: "Ops",     name: "Operasyon"  },
      { key: "Field",   name: "Saha"       },
      { key: "HR",      name: "İnsan Kaynakları" },
      { key: "Finance", name: "Finans"     },
    ];
    deptNames.forEach(({ key, name }) => {
      const existing = db.prepare("SELECT id FROM departments WHERE name = ?").get(name) as { id: string } | undefined;
      if (existing) { departments[key] = existing.id; }
      else {
        const id = uuidv4();
        departments[key] = id;
        insertDepartment.run(id, name, now, now);
      }
    });
    const departmentId = departments["Genel"];

    // ── Statuses ─────────────────────────────────────────────────────────────
    insertWorklogStatus.run("draft",     "Taslak",        1, 0, now, now);
    insertWorklogStatus.run("submitted", "Gönderildi",    2, 0, now, now);
    insertWorklogStatus.run("returned",  "İade",          3, 0, now, now);
    insertWorklogStatus.run("approved",  "Onaylandı",     4, 1, now, now);

    insertTicketStatus.run("open",        "Açık",           1, 0, now, now);
    insertTicketStatus.run("in_progress", "Devam Ediyor",   2, 0, now, now);
    insertTicketStatus.run("waiting",     "Beklemede",      3, 0, now, now);
    insertTicketStatus.run("solved",      "Çözüldü",        4, 0, now, now);
    insertTicketStatus.run("closed",      "Kapandı",        5, 1, now, now);

    // ── Priorities ───────────────────────────────────────────────────────────
    insertPriority.run(uuidv4(), "ticket", "P1", "Kritik", 1, now, now);
    insertPriority.run(uuidv4(), "ticket", "P2", "Yüksek", 2, now, now);
    insertPriority.run(uuidv4(), "ticket", "P3", "Normal", 3, now, now);
    insertPriority.run(uuidv4(), "todo",   "low",  "Düşük",  1, now, now);
    insertPriority.run(uuidv4(), "todo",   "med",  "Orta",   2, now, now);
    insertPriority.run(uuidv4(), "todo",   "high", "Yüksek", 3, now, now);

    // ── SLA Rules ────────────────────────────────────────────────────────────
    insertSlaRule.run(uuidv4(), "P1",  120, now, now);
    insertSlaRule.run(uuidv4(), "P2",  480, now, now);
    insertSlaRule.run(uuidv4(), "P3", 2880, now, now);

    // ── Categories ───────────────────────────────────────────────────────────
    const categories: Record<string, string> = {};
    const orGetCat = (type: string, name: string) => {
      const ex = db.prepare("SELECT id FROM config_categories WHERE type = ? AND name = ?").get(type, name) as { id: string } | undefined;
      if (ex) { categories[`${type}_${name}`] = ex.id; return; }
      const id = uuidv4();
      categories[`${type}_${name}`] = id;
      insertCategory.run(id, type, name, now, now);
    };
    ["Bakım","Destek","Rapor","Saha","Proje","Toplantı","Eğitim"].forEach(n => orGetCat("worklog", n));
    ["Network","Sistem","Yazılım","Operasyon","Araç","Güvenlik","Donanım"].forEach(n => orGetCat("ticket", n));

    // ── Tags ─────────────────────────────────────────────────────────────────
    const tags: Record<string, string> = {};
    const orGetTag = (type: string, name: string) => {
      const ex = db.prepare("SELECT id FROM config_tags WHERE type = ? AND name = ?").get(type, name) as { id: string } | undefined;
      if (ex) { tags[`${type}_${name}`] = ex.id; return; }
      const id = uuidv4();
      tags[`${type}_${name}`] = id;
      insertTag.run(id, type, name, now, now);
    };
    ["Acil","Planlı","Müşteri","Tekrar Eden","Kritik","Test"].forEach(n => {
      orGetTag("ticket",  n);
      orGetTag("worklog", n);
      orGetTag("todo",    n);
    });

    // ── Users ────────────────────────────────────────────────────────────────
    const users: Record<string, string> = {};
    const orGetUser = (username: string, password: string, name: string, role: string, dept: string) => {
      const ex = db.prepare("SELECT id FROM users WHERE username = ?").get(username) as { id: string } | undefined;
      if (ex) { users[username] = ex.id; return; }
      const id = uuidv4();
      users[username] = id;
      db.prepare("INSERT INTO users (id, username, password_hash, full_name, role, department_id, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)").run(id, username, hashPassword(password), name, role, dept, now, now);
    };
    orGetUser("admin",          "admin123!", "Sistem Yöneticisi",  "admin",    departmentId);
    orGetUser("mehmet.yilmaz",  "demo123",   "Mehmet Yılmaz",      "yonetici", departments.IT);
    orGetUser("ayse.demir",     "demo123",   "Ayşe Demir",         "yetkili",  departments.Support);
    orGetUser("ahmet.kaya",     "demo123",   "Ahmet Kaya",         "personel", departments.IT);
    orGetUser("zeynep.celik",   "demo123",   "Zeynep Çelik",       "personel", departments.Support);
    orGetUser("can.ozkan",      "demo123",   "Can Özkan",          "personel", departments.Field);
    orGetUser("elif.aydin",     "demo123",   "Elif Aydın",         "yetkili",  departments.Ops);
    orGetUser("emre.sahin",     "demo123",   "Emre Şahin",         "personel", departments.IT);
    orGetUser("selin.koc",      "demo123",   "Selin Koç",          "yetkili",  departments.HR);
    orGetUser("burak.arslan",   "demo123",   "Burak Arslan",       "personel", departments.Finance);

    // ── Ticket helpers ───────────────────────────────────────────────────────
    const tickets: Record<string, string> = {};
    const mkTicket = (
      no: string, title: string, desc: string,
      catKey: string, priority: string, status: string,
      assigned: string, created: string, dept: string
    ) => {
      const ex = db.prepare("SELECT id FROM tickets WHERE ticket_no = ?").get(no) as { id: string } | undefined;
      if (ex) { tickets[no] = ex.id; return; }
      const id = uuidv4();
      tickets[no] = id;
      db.prepare("INSERT INTO tickets (id, ticket_no, title, description, category_id, priority_code, status_code, created_by, assigned_to, department_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(id, no, title, desc, categories[catKey], priority, status, created, assigned, dept, now, now);
    };
    const addTComment = (no: string, user: string, comment: string) => {
      if (!tickets[no]) return;
      db.prepare("INSERT OR IGNORE INTO ticket_comments (id, ticket_id, user_id, comment, created_at) VALUES (?, ?, ?, ?, ?)").run(uuidv4(), tickets[no], user, comment, now);
    };
    const addTAction = (no: string, title: string, done = 0) => {
      if (!tickets[no]) return;
      db.prepare("INSERT OR IGNORE INTO ticket_actions (id, ticket_id, title, is_done, created_at) VALUES (?, ?, ?, ?, ?)").run(uuidv4(), tickets[no], title, done, now);
    };

    // ── Tickets ──────────────────────────────────────────────────────────────
    mkTicket("OPS-2024-001","Sunucu disk alanı doldu","Ana sunucuda disk kullanımı %95'e ulaştı. Acil müdahale gerekiyor.","ticket_Sistem","P1","in_progress",users["ahmet.kaya"],users["mehmet.yilmaz"],departments.IT);
    mkTicket("OPS-2024-002","Kullanıcı şifre sıfırlama","Ahmet Yıldız kullanıcısı şifresini unutmuş.","ticket_Sistem","P3","solved",users["zeynep.celik"],users["ayse.demir"],departments.Support);
    mkTicket("OPS-2024-003","Network kesintisi - 3. kat","3. katta ağ bağlantısı yok. Switch kontrol edilmeli.","ticket_Network","P2","open",users["can.ozkan"],users["elif.aydin"],departments.Field);
    mkTicket("OPS-2024-004","Yazıcı kurulumu - Muhasebe","Muhasebe departmanına yeni yazıcı kurulacak.","ticket_Araç","P3","waiting",users["can.ozkan"],users["ayse.demir"],departments.Support);
    mkTicket("OPS-2024-005","ERP sistemi yavaş çalışıyor","Sabah saatlerinde ERP sistemi çok yavaş açılıyor.","ticket_Yazılım","P2","in_progress",users["ahmet.kaya"],users["mehmet.yilmaz"],departments.IT);
    mkTicket("OPS-2024-006","VPN bağlantı problemi","Uzaktan çalışan personel VPN ile bağlanamıyor.","ticket_Network","P1","solved",users["ahmet.kaya"],users["ayse.demir"],departments.IT);
    mkTicket("OPS-2024-007","Yeni personel bilgisayar hazırlığı","Pazartesi başlayacak yeni personel için bilgisayar hazırlanacak.","ticket_Operasyon","P3","open",users["zeynep.celik"],users["mehmet.yilmaz"],departments.Support);
    mkTicket("OPS-2024-008","Veri yedekleme hatası","Gecelik yedekleme işlemi hata veriyor.","ticket_Sistem","P1","in_progress",users["ahmet.kaya"],users["mehmet.yilmaz"],departments.IT);
    mkTicket("OPS-2024-009","E-posta sunucusu sertifika uyarısı","Mail sunucusunun TLS sertifikası 7 gün içinde sona eriyor.","ticket_Güvenlik","P2","open",users["emre.sahin"],users["mehmet.yilmaz"],departments.IT);
    mkTicket("OPS-2024-010","Antivirüs güncelleme hatası","15 bilgisayarda antivirüs tanım dosyası güncellenemiyor.","ticket_Güvenlik","P2","in_progress",users["emre.sahin"],users["ayse.demir"],departments.IT);
    mkTicket("OPS-2024-011","Monitör arızası - Muhasebe 3","Muhasebe bölümündeki 3 no'lu monitör görüntü vermiyor.","ticket_Donanım","P3","waiting",users["can.ozkan"],users["zeynep.celik"],departments.Support);
    mkTicket("OPS-2024-012","İnternet bağlantısı yavaş","Tüm ofiste internet hızı düşük, ISP ile görüşülmeli.","ticket_Network","P1","open",users["ahmet.kaya"],users["elif.aydin"],departments.IT);
    mkTicket("OPS-2024-013","Toplantı odası projektör kurulumu","2. kattaki toplantı odasına projeksiyon sistemi kurulacak.","ticket_Donanım","P3","solved",users["can.ozkan"],users["selin.koc"],departments.Ops);
    mkTicket("OPS-2024-014","HR yazılımı erişim sorunu","İK personeli HR modülüne giremediğini bildirdi.","ticket_Yazılım","P2","solved",users["zeynep.celik"],users["selin.koc"],departments.HR);
    mkTicket("OPS-2024-015","Finans raporu dışa aktarma hatası","Aylık finans raporu PDF olarak kayıt edilemiyor.","ticket_Yazılım","P2","closed",users["ahmet.kaya"],users["burak.arslan"],departments.Finance);

    // Ticket comments
    addTComment("OPS-2024-001", users["ahmet.kaya"],    "Disk temizliği yapıldı, eski log dosyaları silindi. 20 GB alan açıldı.");
    addTComment("OPS-2024-001", users["mehmet.yilmaz"], "Kalıcı çözüm için disk genişletme planlanıyor. Tedarik süreci başlatıldı.");
    addTComment("OPS-2024-003", users["can.ozkan"],     "Switch yeniden başlatıldı, sorun devam ediyor. Kablo arızası olabilir.");
    addTComment("OPS-2024-003", users["elif.aydin"],    "Birim yöneticisi bilgilendirildi.");
    addTComment("OPS-2024-005", users["ahmet.kaya"],    "ERP sunucusunda bellek optimizasyonu yapıldı. Sabah testi yapılacak.");
    addTComment("OPS-2024-006", users["ahmet.kaya"],    "VPN sertifikası yenilendi, sorun çözüldü.");
    addTComment("OPS-2024-008", users["emre.sahin"],    "Yedekleme log inceleniyor. Disk write hatası mevcut.");
    addTComment("OPS-2024-009", users["emre.sahin"],    "Sertifika yenileme isteği oluşturuldu. Onay için yönetici bekleniyor.");
    addTComment("OPS-2024-010", users["emre.sahin"],    "10/15 bilgisayar güncellendi. Kalan 5'inde politika sorunu var.");
    addTComment("OPS-2024-012", users["ahmet.kaya"],    "ISP'ye ticket açıldı. 3-4 saat içinde yanıt bekleniyor.");
    addTComment("OPS-2024-013", users["can.ozkan"],     "Projektör kurulumu tamamlandı. Kullanım eğitimi verildi.");
    addTComment("OPS-2024-014", users["zeynep.celik"],  "Yetki tanımlaması düzeltildi. Kullanıcılar erişebiliyor.");
    addTComment("OPS-2024-015", users["ahmet.kaya"],    "PDF kütüphanesi güncellendi. Sorun giderildi.");

    // Ticket actions (checklist)
    addTAction("OPS-2024-001", "Disk kullanımını analiz et", 1);
    addTAction("OPS-2024-001", "Eski log ve geçici dosyaları sil", 1);
    addTAction("OPS-2024-001", "Disk genişletme için talep oluştur", 0);
    addTAction("OPS-2024-001", "Otomatik temizlik scripti kur", 0);
    addTAction("OPS-2024-005", "ERP sunucu kaynaklarını incele", 1);
    addTAction("OPS-2024-005", "Veritabanı indeks optimizasyonu", 0);
    addTAction("OPS-2024-005", "İzleme alarmı ekle", 0);
    addTAction("OPS-2024-006", "Mevcut sertifikaları kontrol et", 1);
    addTAction("OPS-2024-006", "Yeni sertifika yükle", 1);
    addTAction("OPS-2024-006", "Kullanıcı bağlantısını doğrula", 1);
    addTAction("OPS-2024-008", "Yedekleme loglarını incele", 1);
    addTAction("OPS-2024-008", "Yedekleme hedef diskini kontrol et", 0);
    addTAction("OPS-2024-008", "Manuel yedek al", 0);
    addTAction("OPS-2024-009", "Sertifika son tarihini doğrula", 1);
    addTAction("OPS-2024-009", "Yeni sertifika talep et", 1);
    addTAction("OPS-2024-009", "Sertifika yenileme sürecini tamamla", 0);

    // ── Todos ────────────────────────────────────────────────────────────────
    const todos: Record<string, string> = {};
    const mkTodo = (
      key: string, title: string, desc: string,
      status: string, priority: string,
      assigned: string, created: string, dept: string, due: string | null
    ) => {
      const id = uuidv4();
      todos[key] = id;
      db.prepare("INSERT OR IGNORE INTO todos (id, title, description, status_code, priority_code, assigned_to, created_by, department_id, due_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(id, title, desc, status, priority, assigned, created, dept, due, now, now);
    };
    const addTodoComment = (key: string, user: string, comment: string) => {
      if (!todos[key]) return;
      db.prepare("INSERT OR IGNORE INTO todo_comments (id, todo_id, user_id, comment, created_at) VALUES (?, ?, ?, ?, ?)").run(uuidv4(), todos[key], user, comment, now);
    };

    mkTodo("t01","Sunucu bakım planlaması","Aylık sunucu bakım çizelgesi hazırlanacak","todo","med",users["ahmet.kaya"],users["mehmet.yilmaz"],departments.IT,tomorrowIso);
    mkTodo("t02","Kullanıcı eğitim dokümanı","Yeni sistemler için kullanıcı kılavuzu hazırlanacak","doing","high",users["zeynep.celik"],users["ayse.demir"],departments.Support,tomorrowIso);
    mkTodo("t03","Network altyapı incelemesi","Bina network altyapısı gözden geçirilecek","todo","low",users["can.ozkan"],users["elif.aydin"],departments.Field,null);
    mkTodo("t04","Firewall kuralları güncelleme","Güvenlik politikaları doğrultusunda firewall kuralları güncellenecek","doing","high",users["ahmet.kaya"],users["mehmet.yilmaz"],departments.IT,yesterdayIso);
    mkTodo("t05","Yedekleme test prosedürü","Yedekleme geri yükleme testi yapılacak","done","med",users["ahmet.kaya"],users["mehmet.yilmaz"],departments.IT,null);
    mkTodo("t06","Destek portal güncelleme","Kullanıcı destek portalına yeni özellikler eklenecek","todo","low",users["zeynep.celik"],users["ayse.demir"],departments.Support,null);
    mkTodo("t07","Ağ kablolaması güncelleme planı","3. kattaki eski cat5 kablolar cat6 ile değiştirilecek","todo","med",users["can.ozkan"],users["elif.aydin"],departments.Field,tomorrowIso);
    mkTodo("t08","Kullanıcı hesap denetimleri","Aktif olmayan hesapların tespiti ve deaktivasyonu","doing","med",users["emre.sahin"],users["mehmet.yilmaz"],departments.IT,null);
    mkTodo("t09","Yazıcı sarf malzeme siparişi","Tüm yazıcılar için toner ve mürekkep siparişi","done","low",users["zeynep.celik"],users["ayse.demir"],departments.Support,null);
    mkTodo("t10","UPS batarya kontrolü","Sunucu odasındaki UPS cihazlarının batarya testi","todo","high",users["emre.sahin"],users["mehmet.yilmaz"],departments.IT,yesterdayIso);
    mkTodo("t11","Personel işe giriş ekipman hazırlığı","Yeni başlayan 3 personel için dizüstü bilgisayar ve aksesuarlar","doing","high",users["zeynep.celik"],users["selin.koc"],departments.HR,todayDate);
    mkTodo("t12","Aylık IT envanter güncellemesi","Tüm IT ekipmanlarının envanter sistemine girilmesi","todo","low",users["emre.sahin"],users["mehmet.yilmaz"],departments.IT,null);
    mkTodo("t13","Yazılım lisans yenileme takibi","Süresi dolan yazılım lisanslarının tespit ve yenilenmesi","done","med",users["ahmet.kaya"],users["mehmet.yilmaz"],departments.IT,null);
    mkTodo("t14","Ofis Wi-Fi şifre değişimi","Güvenlik protokolü gereği Wi-Fi şifreleri yenilenecek","done","med",users["can.ozkan"],users["elif.aydin"],departments.Field,null);
    mkTodo("t15","Müşteri ziyareti hazırlığı","Salı günkü müşteri demo için toplantı odası ve teknik hazırlık","doing","high",users["elif.aydin"],users["ayse.demir"],departments.Ops,tomorrowIso);

    // Todo comments
    addTodoComment("t01", users["ahmet.kaya"],   "Taslak hazırlandı, yönetici onayı bekleniyor.");
    addTodoComment("t02", users["zeynep.celik"], "Word formatında hazırlandı, PDF çevrilecek.");
    addTodoComment("t02", users["ayse.demir"],   "İki bölüm daha eklenmesi gerekiyor.");
    addTodoComment("t04", users["ahmet.kaya"],   "Standart kurallar uygulandı. Özel istisnalar inceleniyor.");
    addTodoComment("t07", users["can.ozkan"],    "Maliyet tahmini hazırlandı: ~15.000 TL. Onay bekleniyor.");
    addTodoComment("t10", users["emre.sahin"],   "İki UPS'te kapasite düşüşü tespit edildi. Değişim gerekiyor.");
    addTodoComment("t11", users["zeynep.celik"], "2/3 bilgisayar hazırlandı. Kulaklıklar hâlâ tedarik bekliyor.");
    addTodoComment("t15", users["elif.aydin"],   "Sunum slaytları hazır. Projektör ve wifi test edildi.");

    // ── Todo Templates ───────────────────────────────────────────────────────
    const tmplInsert = db.prepare("INSERT OR IGNORE INTO todo_templates (id, title, description, role_target, department_id, is_active, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)");
    tmplInsert.run(uuidv4(),"Yeni personel IT kurulumu","Laptop kurulumu, kullanıcı hesabı oluşturma, e-posta ve VPN erişimi sağlanması.","personel",departments.IT,users["mehmet.yilmaz"],now,now);
    tmplInsert.run(uuidv4(),"Aylık sunucu bakımı","Disk, CPU ve RAM kullanımı kontrolü; yedekleme doğrulama; log temizleme; güvenlik yamalarının uygulanması.",null,departments.IT,users["mehmet.yilmaz"],now,now);
    tmplInsert.run(uuidv4(),"Haftalık ekipman turu","Ofisteki tüm IT ekipmanlarının fiziksel kontrolü ve çalışırlık testi.","personel",departments.Field,users["elif.aydin"],now,now);
    tmplInsert.run(uuidv4(),"Ticket haftalık özet raporu","Son 7 günün ticket istatistikleri hazırlanacak ve yöneticiye sunulacak.","yetkili",null,users["ayse.demir"],now,now);
    tmplInsert.run(uuidv4(),"Kullanıcı hesap kapatma prosedürü","İşten ayrılan çalışanın tüm sistem erişimlerinin kapatılması ve ekipman iadesi.",null,departments.IT,users["mehmet.yilmaz"],now,now);

    // ── Worklogs (son 7 gün, tüm aktif kullanıcılar) ─────────────────────────
    const wInsert = db.prepare("INSERT INTO worklogs (id, user_id, work_date, summary, status_code, submitted_at, approved_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    const wiInsert = db.prepare("INSERT OR IGNORE INTO worklog_items (id, worklog_id, title, category_id, duration_minutes, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    const getWorklog = db.prepare("SELECT id FROM worklogs WHERE user_id = ? AND work_date = ?");

    const wlData: { user: string; date: string; summary: string; status: "draft"|"submitted"|"returned"|"approved"; items: {title:string;cat:string;dur:number;note?:string}[] }[] = [
      // ── ahmet.kaya (IT personel)
      { user: "ahmet.kaya", date: daysAgo(6), summary: "Sunucu bakım ve güvenlik yamaları", status: "approved",
        items: [
          { title: "Windows güncellemeleri uygulandı – 8 sunucu", cat: "worklog_Bakım", dur: 180 },
          { title: "Firewall log incelemesi", cat: "worklog_Bakım", dur: 60 },
          { title: "Kullanıcı şifre talepleri", cat: "worklog_Destek", dur: 90 },
          { title: "Ekip toplantısı", cat: "worklog_Toplantı", dur: 30 },
        ]},
      { user: "ahmet.kaya", date: daysAgo(5), summary: "ERP sorun giderme ve yedekleme testi", status: "approved",
        items: [
          { title: "ERP performans analizi", cat: "worklog_Bakım", dur: 120, note: "İndeks yeniden oluşturuldu" },
          { title: "Yedekleme geri yükleme testi", cat: "worklog_Bakım", dur: 90 },
          { title: "Antivirüs politika güncellemesi", cat: "worklog_Bakım", dur: 60 },
        ]},
      { user: "ahmet.kaya", date: daysAgo(4), summary: "Network donanım kontrolü", status: "approved",
        items: [
          { title: "Switch ve access point kontrolü", cat: "worklog_Saha", dur: 150 },
          { title: "Kablo dökümanı güncellendi", cat: "worklog_Rapor", dur: 60 },
          { title: "Kullanıcı destek çağrıları", cat: "worklog_Destek", dur: 90 },
        ]},
      { user: "ahmet.kaya", date: daysAgo(3), summary: "Disk analizi ve temizlik – OPS-2024-001", status: "approved",
        items: [
          { title: "Sunucu disk analizi", cat: "worklog_Bakım", dur: 120 },
          { title: "Log dosyası temizliği (20 GB)", cat: "worklog_Bakım", dur: 90, note: "OPS-2024-001 için yapıldı" },
          { title: "Otomatik temizlik script taslağı", cat: "worklog_Proje", dur: 60 },
        ]},
      { user: "ahmet.kaya", date: daysAgo(2), summary: "VPN sertifika yenileme", status: "approved",
        items: [
          { title: "VPN sertifika yenileme (OPS-2024-006)", cat: "worklog_Bakım", dur: 90 },
          { title: "Uzak kullanıcı bağlantı testleri", cat: "worklog_Destek", dur: 60 },
          { title: "E-posta sertifika kontrol raporu", cat: "worklog_Rapor", dur: 60 },
        ]},
      { user: "ahmet.kaya", date: daysAgo(1), summary: "Sunucu bakımı ve sorun giderme", status: "approved",
        items: [
          { title: "Sistem monitörü kontrolü", cat: "worklog_Bakım", dur: 120 },
          { title: "Kullanıcı destek çağrıları", cat: "worklog_Destek", dur: 180 },
        ]},
      { user: "ahmet.kaya", date: daysAgo(0), summary: "Günlük operasyon işlemleri", status: "submitted",
        items: [
          { title: "Sabah sistem kontrolleri", cat: "worklog_Bakım", dur: 60 },
          { title: "Açık ticket'lar güncellendi", cat: "worklog_Destek", dur: 90 },
        ]},

      // ── zeynep.celik (Destek personel)
      { user: "zeynep.celik", date: daysAgo(6), summary: "Kullanıcı destek ve şifre işlemleri", status: "approved",
        items: [
          { title: "Şifre sıfırlama talepleri (12 kişi)", cat: "worklog_Destek", dur: 120 },
          { title: "Yeni kullanıcı onboarding", cat: "worklog_Destek", dur: 90 },
          { title: "Destek dokümanı güncelleme", cat: "worklog_Rapor", dur: 60 },
        ]},
      { user: "zeynep.celik", date: daysAgo(5), summary: "Yazıcı ve donanım destek", status: "approved",
        items: [
          { title: "Muhasebe yazıcı kurulumu (OPS-2024-004)", cat: "worklog_Destek", dur: 90 },
          { title: "Kullanıcı eğitim dokümanı taslağı", cat: "worklog_Eğitim", dur: 120 },
        ]},
      { user: "zeynep.celik", date: daysAgo(4), summary: "Destek çağrıları ve raporlama", status: "approved",
        items: [
          { title: "Günlük destek çağrı raporu", cat: "worklog_Rapor", dur: 60 },
          { title: "HR yazılımı erişim sorunu giderildi (OPS-2024-014)", cat: "worklog_Destek", dur: 90 },
          { title: "Kullanıcı memnuniyet anket takibi", cat: "worklog_Rapor", dur: 60 },
        ]},
      { user: "zeynep.celik", date: daysAgo(3), summary: "Ekipman sipariş ve stok takibi", status: "approved",
        items: [
          { title: "Toner/mürekkep sipariş edildi", cat: "worklog_Saha", dur: 60 },
          { title: "Stok listesi güncellendi", cat: "worklog_Rapor", dur: 60 },
          { title: "Kullanıcı destek çağrıları", cat: "worklog_Destek", dur: 120 },
        ]},
      { user: "zeynep.celik", date: daysAgo(2), summary: "Yeni personel ekipman hazırlığı", status: "approved",
        items: [
          { title: "3 dizüstü bilgisayar kurulumu", cat: "worklog_Destek", dur: 180 },
          { title: "Kulaklık ve aksesuarlar teslim formu", cat: "worklog_Rapor", dur: 30 },
        ]},
      { user: "zeynep.celik", date: daysAgo(1), summary: "Kullanıcı destek talepleri", status: "approved",
        items: [
          { title: "Sistem monitörü kontrolü", cat: "worklog_Bakım", dur: 60 },
          { title: "Kullanıcı destek çağrıları", cat: "worklog_Destek", dur: 210 },
        ]},
      { user: "zeynep.celik", date: daysAgo(0), summary: "Destek çağrıları ve eğitim", status: "draft",
        items: [
          { title: "Kullanıcı eğitim dokümanı üzerinde çalışma", cat: "worklog_Eğitim", dur: 120 },
        ]},

      // ── can.ozkan (Saha personel)
      { user: "can.ozkan", date: daysAgo(6), summary: "Saha network kontrolü ve bakım", status: "approved",
        items: [
          { title: "3. kat switch kablolaması incelendi (OPS-2024-003)", cat: "worklog_Saha", dur: 150 },
          { title: "Access point sinyal ölçümü", cat: "worklog_Saha", dur: 60 },
          { title: "Çözümsüz ticket raporu", cat: "worklog_Rapor", dur: 30 },
        ]},
      { user: "can.ozkan", date: daysAgo(4), summary: "Ekipman kurulu ve bakım", status: "approved",
        items: [
          { title: "Toplantı odası projektör kurulumu (OPS-2024-013)", cat: "worklog_Saha", dur: 120 },
          { title: "Wi-Fi şifre değişimi tüm ofis", cat: "worklog_Saha", dur: 60 },
        ]},
      { user: "can.ozkan", date: daysAgo(2), summary: "Network altyapı incelemesi", status: "approved",
        items: [
          { title: "Kat bazlı network şeması oluşturuldu", cat: "worklog_Rapor", dur: 120 },
          { title: "Cat6 kablo değişimi maliyet tahmini", cat: "worklog_Proje", dur: 90 },
        ]},
      { user: "can.ozkan", date: daysAgo(1), summary: "Saha ekipman kontrolleri", status: "approved",
        items: [
          { title: "Sistem monitörü kontrolü", cat: "worklog_Bakım", dur: 60 },
          { title: "Kullanıcı destek çağrıları", cat: "worklog_Destek", dur: 120 },
        ]},

      // ── emre.sahin (IT personel)
      { user: "emre.sahin", date: daysAgo(5), summary: "Güvenlik denetimi ve antivirüs", status: "approved",
        items: [
          { title: "Antivirüs politika dağıtımı (OPS-2024-010)", cat: "worklog_Bakım", dur: 150 },
          { title: "E-posta sertifika uyarı analizi (OPS-2024-009)", cat: "worklog_Bakım", dur: 90 },
        ]},
      { user: "emre.sahin", date: daysAgo(3), summary: "Hesap denetimi ve lisans takibi", status: "approved",
        items: [
          { title: "Aktif olmayan hesap tespiti (45 proje)", cat: "worklog_Bakım", dur: 120 },
          { title: "Yazılım lisans güncelleme raporu", cat: "worklog_Rapor", dur: 90 },
        ]},
      { user: "emre.sahin", date: daysAgo(1), summary: "UPS test ve sistem kontrolü", status: "submitted",
        items: [
          { title: "UPS batarya test (2 arızalı tespit edildi)", cat: "worklog_Saha", dur: 120 },
          { title: "Güvenlik log analizi", cat: "worklog_Bakım", dur: 90 },
        ]},
      { user: "emre.sahin", date: daysAgo(0), summary: "Günlük sistem bakımı", status: "draft",
        items: [
          { title: "Sabah kontrolleri ve alarm incelemesi", cat: "worklog_Bakım", dur: 60 },
        ]},

      // ── elif.aydin (Ops yetkili)
      { user: "elif.aydin", date: daysAgo(5), summary: "Operasyon toplantısı ve raporlama", status: "approved",
        items: [
          { title: "Departman koordinasyon toplantısı", cat: "worklog_Toplantı", dur: 90 },
          { title: "IT operasyon haftalık özet", cat: "worklog_Rapor", dur: 120 },
        ]},
      { user: "elif.aydin", date: daysAgo(3), summary: "Proje takibi ve müşteri hazırlığı", status: "approved",
        items: [
          { title: "Müşteri ziyareti hazırlık toplantısı", cat: "worklog_Toplantı", dur: 60 },
          { title: "Operasyon süreç dokümanı", cat: "worklog_Proje", dur: 150 },
        ]},
      { user: "elif.aydin", date: daysAgo(1), summary: "Ticket takibi ve koordinasyon", status: "submitted",
        items: [
          { title: "Açık ticket durum güncellemesi", cat: "worklog_Rapor", dur: 60 },
          { title: "Ekip koordinasyon görüşmesi", cat: "worklog_Toplantı", dur: 60 },
          { title: "Müşteri demo hazırlığı", cat: "worklog_Proje", dur: 120 },
        ]},
    ];

    for (const w of wlData) {
      const uid = users[w.user];
      if (!uid) continue;
      const ex = getWorklog.get(uid, w.date) as { id: string } | undefined;
      let wlId: string;
      if (ex) {
        wlId = ex.id;
      } else {
        wlId = uuidv4();
        const submittedAt = (w.status === "submitted" || w.status === "approved") ? now : null;
        const approvedAt  = w.status === "approved" ? now : null;
        wInsert.run(wlId, uid, w.date, w.summary, w.status, submittedAt, approvedAt, now, now);
      }
      for (const item of w.items) {
        wiInsert.run(uuidv4(), wlId, item.title, categories[item.cat], item.dur, item.note ?? null, now, now);
      }
    }

    // ── Transportation ────────────────────────────────────────────────────────
    const creatorId = (db.prepare("SELECT id FROM users WHERE username = 'mehmet.yilmaz'").get() as any)?.id
                   || (db.prepare("SELECT id FROM users WHERE username = 'admin'").get() as any)?.id;

    if (creatorId) {
      const vInsert = db.prepare("INSERT INTO vehicles (id, plate, type, capacity, brand, model, year, driver_name, driver_phone, status_code, notes, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
      const selVeh  = db.prepare("SELECT id FROM vehicles WHERE plate = ?");
      const mkVeh   = (plate: string, type: string, cap: number, brand: string, model: string, year: number, drvName: string|null, drvPhone: string|null, status: string, notes: string|null) => {
        const ex = selVeh.get(plate) as { id: string } | undefined;
        if (ex) return ex.id;
        const id = uuidv4();
        vInsert.run(id, plate, type, cap, brand, model, year, drvName, drvPhone, status, notes, creatorId, now, now);
        return id;
      };
      const v1 = mkVeh("34 TRY 001","minibus",14,"Ford","Transit",2021,"Ahmet Sürücü","0532 111 2233","active",null);
      const v2 = mkVeh("34 TRY 002","midibus",20,"Mercedes","Sprinter",2022,"Mehmet Şoför","0532 444 5566","active",null);
      const v3 = mkVeh("34 TRY 003","minibus",14,"Volkswagen","Transporter",2020,"Ali Kaptan","0533 777 8899","active",null);
      const v4 = mkVeh("34 TRY 004","sedan",4,"Toyota","Corolla",2023,null,null,"maintenance","Periyodik bakımda");
      const v5 = mkVeh("34 TRY 005","midibus",24,"Mercedes","Benz Sprinter",2023,"Hüseyin Şahin","0535 222 3344","active",null);

      // Routes (INSERT OR IGNORE – idempotent)
      const rIns = db.prepare("INSERT OR IGNORE INTO routes (id, name, code, direction, morning_departure, morning_arrival, evening_departure, evening_arrival, stops_json, vehicle_id, is_active, notes, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)");
      const selRoute = db.prepare("SELECT id FROM routes WHERE code = ?");
      const mkRoute  = (code: string, name: string, dir: string, mDep: string|null, mArr: string|null, eDep: string|null, eArr: string|null, vid: string, stops: object[]|null) => {
        const ex = selRoute.get(code) as { id: string } | undefined;
        if (ex) return ex.id;
        const id = uuidv4();
        rIns.run(id, name, code, dir, mDep, mArr, eDep, eArr, stops ? JSON.stringify(stops) : null, vid, null, creatorId, now, now);
        return id;
      };
      const r1 = mkRoute("HAT-01","Kadıköy – Merkez",  "both",   "07:30","08:15","18:00","18:45",v1,[{name:"Kadıköy İskele",order:1},{name:"Fikirtepe",order:2},{name:"Merkez Giriş",order:3}]);
      const r2 = mkRoute("HAT-02","Üsküdar – Merkez",  "both",   "07:45","08:20","18:15","18:50",v2,[{name:"Üsküdar İskele",order:1},{name:"Altunizade",order:2},{name:"Merkez Giriş",order:3}]);
      const r3 = mkRoute("HAT-03","Bostancı – Merkez", "morning","07:15","08:00",null,   null,   v3,[{name:"Bostancı",order:1},{name:"E-5 Bağlantı",order:2},{name:"Merkez Giriş",order:3}]);
      const r4 = mkRoute("HAT-04","Pendik – Merkez",   "both",   "07:00","08:10","18:30","19:40",v5,[{name:"Pendik İstasyon",order:1},{name:"Kartal",order:2},{name:"Maltepe",order:3},{name:"Merkez Giriş",order:4}]);

      // Trips – today + yesterday
      const tIns = db.prepare("INSERT OR IGNORE INTO trips (id, trip_date, route_id, vehicle_id, direction, planned_departure, planned_arrival, passenger_count, status_code, delay_minutes, notes, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
      const mkTrip = (date: string, rid: string, vid: string, dir: string, pDep: string, pArr: string, pax: number, status: string, delay: number, notes: string|null) =>
        tIns.run(uuidv4(), date, rid, vid, dir, pDep, pArr, pax, status, delay, notes, creatorId, now, now);

      // Today
      mkTrip(todayDate,r1,v1,"morning","07:30","08:15",12,"arrived",0,null);
      mkTrip(todayDate,r2,v2,"morning","07:45","08:20",18,"delayed",8,"Trafik sebebiyle gecikme");
      mkTrip(todayDate,r3,v3,"morning","07:15","08:00", 9,"arrived",0,null);
      mkTrip(todayDate,r4,v5,"morning","07:00","08:10",20,"arrived",0,null);
      mkTrip(todayDate,r1,v1,"evening","18:00","18:45", 0,"planned",0,null);
      mkTrip(todayDate,r2,v2,"evening","18:15","18:50", 0,"planned",0,null);
      mkTrip(todayDate,r4,v5,"evening","18:30","19:40", 0,"planned",0,null);
      // Yesterday
      mkTrip(yesterdayIso,r1,v1,"morning","07:30","08:15",14,"arrived",0,null);
      mkTrip(yesterdayIso,r2,v2,"morning","07:45","08:20",19,"arrived",0,null);
      mkTrip(yesterdayIso,r3,v3,"morning","07:15","08:00",11,"arrived",2,"Minör gecikme – kırmızı ışık");
      mkTrip(yesterdayIso,r4,v5,"morning","07:00","08:10",22,"delayed",15,"E-5 kaza nedeniyle gecikme");
      mkTrip(yesterdayIso,r1,v1,"evening","18:00","18:45",13,"arrived",0,null);
      mkTrip(yesterdayIso,r2,v2,"evening","18:15","18:50",17,"arrived",5,"Kalkışta trafik");
      mkTrip(yesterdayIso,r4,v5,"evening","18:30","19:40",21,"arrived",0,null);
      // 2 days ago
      mkTrip(daysAgo(2),r1,v1,"morning","07:30","08:15",13,"arrived",0,null);
      mkTrip(daysAgo(2),r2,v2,"morning","07:45","08:20",16,"arrived",0,null);
      mkTrip(daysAgo(2),r3,v3,"morning","07:15","08:00",10,"arrived",0,null);
      mkTrip(daysAgo(2),r4,v5,"morning","07:00","08:10",23,"arrived",0,null);
      mkTrip(daysAgo(2),r1,v1,"evening","18:00","18:45",14,"arrived",0,null);
      mkTrip(daysAgo(2),r2,v2,"evening","18:15","18:50",16,"arrived",0,null);
      mkTrip(daysAgo(2),r4,v5,"evening","18:30","19:40",22,"arrived",0,null);

      // Entry controls
      const ecIns = db.prepare("INSERT OR IGNORE INTO entry_controls (id, control_date, route_id, planned_time, actual_time, delay_minutes, passenger_expected, passenger_actual, status_code, notes, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
      const mkEC  = (date: string, rid: string, pt: string, at: string, delay: number, exp: number, act: number, status: string, notes: string|null) =>
        ecIns.run(uuidv4(), date, rid, pt, at, delay, exp, act, status, notes, creatorId, now, now);

      mkEC(todayDate,    r1,"08:15","08:15",0,14,12,"on_time",null);
      mkEC(todayDate,    r2,"08:20","08:28",8,20,18,"delayed","Trafik sebebiyle");
      mkEC(todayDate,    r3,"08:00","07:58",0,14, 9,"on_time",null);
      mkEC(todayDate,    r4,"08:10","08:10",0,24,20,"on_time",null);
      mkEC(yesterdayIso, r1,"08:15","08:15",0,14,14,"on_time",null);
      mkEC(yesterdayIso, r2,"08:20","08:20",0,20,19,"on_time",null);
      mkEC(yesterdayIso, r3,"08:00","08:02",2,14,11,"on_time","Minör gecikme");
      mkEC(yesterdayIso, r4,"08:10","08:25",15,24,22,"delayed","E-5 kaza etkisi");
      mkEC(daysAgo(2),   r1,"08:15","08:15",0,14,13,"on_time",null);
      mkEC(daysAgo(2),   r2,"08:20","08:20",0,20,16,"on_time",null);
      mkEC(daysAgo(2),   r3,"08:00","08:00",0,14,10,"on_time",null);
      mkEC(daysAgo(2),   r4,"08:10","08:10",0,24,23,"on_time",null);

      // Inspections
      const iIns = db.prepare("INSERT OR IGNORE INTO inspections (id, vehicle_id, inspection_date, inspector_id, type, result, checklist_json, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
      const checklist = (overrides: Record<string,{ok:boolean;note:string}> = {}) => JSON.stringify(
        ["Lastikler","Frenler","Lambalar","Cam silecekleri","Evrak / ruhsat","İlk yardım kiti","Yangın tüpü","Temizlik"].map(label => ({
          label, ok: overrides[label]?.ok ?? true, note: overrides[label]?.note ?? ""
        }))
      );
      iIns.run(uuidv4(),v1,daysAgo(6),creatorId,"routine","pass",checklist(),null,now,now);
      iIns.run(uuidv4(),v1,yesterdayIso,creatorId,"pre_trip","pass",checklist(),null,now,now);
      iIns.run(uuidv4(),v2,daysAgo(5),creatorId,"routine","conditional",
        checklist({"Lambalar":{ok:false,note:"Sağ arka stop lambası arızalı"}}),
        "Stop lambası değiştirilmeli",now,now);
      iIns.run(uuidv4(),v2,todayDate,creatorId,"pre_trip","pass",checklist(),null,now,now);
      iIns.run(uuidv4(),v3,daysAgo(4),creatorId,"routine","pass",checklist(),null,now,now);
      iIns.run(uuidv4(),v4,daysAgo(3),creatorId,"periodic","conditional",
        checklist({"Frenler":{ok:false,note:"Ön fren balataları %20 kaldı"},"Lastikler":{ok:false,note:"Sağ ön lastik hasarlı"}}),
        "Bakımda – ön balata ve lastik değişimi yapılıyor",now,now);
      iIns.run(uuidv4(),v5,daysAgo(2),creatorId,"routine","pass",checklist(),null,now,now);
      iIns.run(uuidv4(),v5,todayDate,creatorId,"pre_trip","pass",checklist(),null,now,now);
    }

    // ── Companies & Arrivals ──────────────────────────────────────────────────
    const adminId = (db.prepare("SELECT id FROM users WHERE username = 'admin'").get() as any)?.id;
    const recorderByElif = users["elif.aydin"] || adminId;

    const cIns = db.prepare("INSERT OR IGNORE INTO companies (id, name, notes, is_active, created_by, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?, ?)");
    const cvIns = db.prepare("INSERT OR IGNORE INTO company_vehicles (id, company_id, plate, notes, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)");
    const vaIns = db.prepare("INSERT OR IGNORE INTO vehicle_arrivals (id, company_id, vehicle_id, arrival_date, arrived_at, recorded_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)");
    const selCo = db.prepare("SELECT id FROM companies WHERE name = ?");
    const selCV = db.prepare("SELECT id FROM company_vehicles WHERE company_id = ? AND plate = ?");

    const mkCo = (name: string, notes: string|null): string => {
      const ex = selCo.get(name) as { id: string } | undefined;
      if (ex) return ex.id;
      const id = uuidv4();
      cIns.run(id, name, notes, adminId || recorderByElif, now, now);
      return id;
    };
    const mkCV = (coId: string, plate: string, notes: string|null): string => {
      const ex = selCV.get(coId, plate) as { id: string } | undefined;
      if (ex) return ex.id;
      const id = uuidv4();
      cvIns.run(id, coId, plate, notes, now, now);
      return id;
    };

    const co1 = mkCo("Anadolu Lojistik A.Ş.",    "Haftalık malzeme teslimatı");
    const co2 = mkCo("Merkez Temizlik Hizmetleri","Günlük temizlik servis firması");
    const co3 = mkCo("TechParts Tedarik Ltd.",    "IT ekipman ve sarf malzeme tedarikçisi");
    const co4 = mkCo("Güvenlik Pro A.Ş.",          "Özel güvenlik firma");
    const co5 = mkCo("Ofis Mobilya Merkezi",       "Mobilya ve ofis ekipman tedarikçisi");

    const cv1a = mkCV(co1,"34 ANL 001","Büyük kamyon – haftalık");
    const cv1b = mkCV(co1,"34 ANL 002","Küçük van – acil teslimat");
    const cv2a = mkCV(co2,"34 TMP 010","Temizlik servisi arabası");
    const cv3a = mkCV(co3,"34 TPC 055","IT ekipman teslimat aracı");
    const cv3b = mkCV(co3,"34 TPC 056","Yedek parça kurye");
    const cv4a = mkCV(co4,"34 GVN 201","Güvenlik devriye aracı");
    const cv5a = mkCV(co5,"34 MOB 033","Mobilya teslimat kamyonu");

    // Arrivals – last 7 days
    const mkArr = (cvId: string, coId: string, date: string, time: string) =>
      vaIns.run(uuidv4(), coId, cvId, date, time, recorderByElif, now);

    mkArr(cv1a,co1,daysAgo(6),"09:30"); mkArr(cv2a,co2,daysAgo(6),"07:00");
    mkArr(cv4a,co4,daysAgo(6),"08:30");
    mkArr(cv1b,co1,daysAgo(5),"14:15"); mkArr(cv2a,co2,daysAgo(5),"07:05");
    mkArr(cv3a,co3,daysAgo(5),"10:20");
    mkArr(cv1a,co1,daysAgo(4),"09:45"); mkArr(cv2a,co2,daysAgo(4),"07:00");
    mkArr(cv4a,co4,daysAgo(4),"08:30"); mkArr(cv5a,co5,daysAgo(4),"11:00");
    mkArr(cv2a,co2,daysAgo(3),"07:02"); mkArr(cv3b,co3,daysAgo(3),"13:00");
    mkArr(cv1a,co1,daysAgo(2),"09:30"); mkArr(cv2a,co2,daysAgo(2),"07:00");
    mkArr(cv3a,co3,daysAgo(2),"10:00"); mkArr(cv4a,co4,daysAgo(2),"08:30");
    mkArr(cv1b,co1,daysAgo(1),"15:00"); mkArr(cv2a,co2,daysAgo(1),"07:05");
    mkArr(cv3b,co3,daysAgo(1),"12:30");
    mkArr(cv2a,co2,todayDate,"07:00"); mkArr(cv4a,co4,todayDate,"08:30");
    mkArr(cv1a,co1,todayDate,"09:15");
  });

  tx();
}
