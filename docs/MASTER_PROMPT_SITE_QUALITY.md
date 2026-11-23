# FRAMEHUNT THAILAND — Master Prompt ตรวจและพัฒนาคุณภาพทั้งเว็บไซต์

นำ prompt นี้ไปใช้กับ repository ปัจจุบันของ Framehunt Thailand เพื่อหาข้อ
บกพร่องจากหลักฐานจริง แล้วแก้เป็นชุดที่ใช้งานได้ ห้ามจบที่แผนงานหรือรายการ TODO
อย่างเดียว ให้ใช้ร่วมกับ `MASTER_PROMPT.md`, `MASTER_PROMPT_COMPLETION_GAPS.md`
และ `MASTER_PROMPT_UX_UI_MOTION.md` โดยรักษาข้อมูลและรูปแบบ Glassmorphism + Clay
ที่ผู้ใช้เลือกไว้

## เป้าหมาย

ทำให้เว็บค้นพบสถานที่ได้จริง อ่านเข้าใจ ใช้ได้บนมือถือ/คีย์บอร์ด/ทั้งสองภาษา
โหลดอย่างมีประสิทธิภาพ และแสดงสถานะภาพหรือข้อมูลที่ขาดอย่างตรงไปตรงมา ทุกครั้งให้
เลือกแก้ปัญหาสำคัญที่สุดจาก audit รอบปัจจุบัน แล้วปิดเป็น vertical slice พร้อม
หลักฐานตรวจรับ ห้ามอ้างว่างานครบเพราะเพียง build ผ่าน

## สำรวจและจัดลำดับ

1. อ่าน repository instructions, git status, branch, diff และเอกสาร verification
   ก่อนแก้ไฟล์ เก็บ untracked changes ของผู้ใช้ไว้ตามเดิม
2. ตรวจหน้า production และ route ที่เปลี่ยนด้วย browser/accessibility tree ก่อน
   ใช้ snapshot เดิมเป็นเพียงเบาะแส ไม่ใช่สถานะล่าสุด
3. รัน audit ที่มีอยู่เพื่อดึงตัวเลขจริง: coverage/URL/สิทธิ์ภาพ, i18n, build
   payload และ route health แยก “ขาด”, “เสีย”, “ถูกบล็อก”, “ยังตรวจไม่ได้” และ
   “สิทธิ์ยังไม่ยืนยัน” ออกจากกัน
4. ตรวจ UI ทั้งแบบเห็นได้และ dynamic: ข้อความจากข้อมูล, template strings,
   placeholders, aria-label, title, alt, toast, modal, empty/loading/error/success,
   สถานะฟิลเตอร์, วันที่/ระยะทาง และข้อความ footer; static JSX audit อย่างเดียว
   ไม่ถือว่าครอบคลุม
5. จัดความรุนแรงเป็น P0 ใช้งานไม่ได้/ข้อมูลผิด/เสี่ยง, P1 flow หลักหรือภาพ
   แสดงผิด/พัง/อ่านไม่ได้, P2 ภาษา/keyboard/responsive/ความเร็ว, P3 polish
   แล้วแก้ P0/P1 ก่อน

## คุณภาพเนื้อหาและภาพ

- สถานที่ ภาพปก โปสเตอร์ จำนวนภาพ และสถานะตรวจสอบต้องสะท้อนข้อมูลต้นทางที่มี
  จริง ห้ามนับภาพ generic, AI, ภาพผิดสถานที่ หรือ URL ที่ตอบเพียง 200 เป็นภาพที่
  ยืนยันแล้ว
- ภาพที่เสียต้องมีข้อความไทย/อังกฤษที่เข้าใจได้ มีทางกู้คืนเมื่อทำได้ และไม่ทำให้
  การ์ดหรือหน้าเว็บเหลือกรอบว่าง ห้ามใช้รูปสำรองจากสถานที่อื่นมาแทนให้ดูเหมือนจริง
- ตรวจสิทธิ์แยกจากความพร้อมของ URL; เก็บผู้ถ่าย เครดิต ใบอนุญาต แหล่งต้นทาง
  หลักฐานจับคู่สถานที่ และวันที่ตรวจตาม `MASTER_PROMPT_COMPLETION_GAPS.md`
- สถิติทุกหน้าอธิบายขอบเขตและฐานนับ ห้ามเอารายการ directory ที่ยังไม่ผ่าน
  verification ไปรวมเป็นสถานที่ยืนยันแล้วโดยไม่บอกระดับข้อมูล

## ภาษาและ accessibility

- ภาษาอังกฤษต้องครอบคลุมข้อความบนทุก route รวม dynamic data และคำที่ assistive
  technology อ่าน ไม่ทิ้ง Thai template literal ใน aria-label หรือสถานะ error
- เก็บชื่อเฉพาะที่ไม่มีคำแปลทางการเป็นต้นฉบับได้ แต่ให้แยกจากข้อความ UI และ
  แสดงให้รู้ว่าเป็นชื่อสถานที่/ชื่อผู้ถ่าย/ชื่อไฟล์
- ใช้ semantic element และ label ที่ระบุหน้าที่ ปุ่มไอคอนต้องมีชื่อ ฟอร์มแจ้ง
  ข้อผิดพลาดพร้อมวิธีแก้ focus ต้องมองเห็นและเดินด้วย keyboard ได้
- ตรวจ contrast, target size, focus, modal focus/escape, live status และ
  `prefers-reduced-motion`; animation ต้องไม่จำเป็นต่อการทำงาน
- เคารพการตั้งค่าเดิม และอย่าลด contrast เพื่อให้ glass effect เด่น

## UX, responsive และ performance

- ตรวจหน้าหลัก, ค้นหา/กรอง/เรียง/แผนที่, detail, save/board, submit, gallery และ
  directory ทุกหมวดบนความกว้างมือถือและ desktop ที่เกี่ยวข้อง
- URL/query ต้องสะท้อนตัวกรองเมื่อเป็นพฤติกรรมเดิม; ปุ่ม/ลิงก์ทุกตัวทำงานจริง
  มี loading/empty/error/retry/success ที่สอดคล้อง
- วัด build output และเส้นทางโหลดจริง แยก entry, map, admin, data และรูปภาพ
  ลด payload ที่ผู้ใช้ไม่ต้องใช้ใน route แรก ใช้ lazy loading/caching/responsive
  sources อย่างปลอดภัย และป้องกัน layout shift
- อย่าทำ visual redesign แบบกว้างถ้าหลักฐานบอกว่าต้องแก้เฉพาะ flow; รักษา
  controls, content, route และข้อมูลเดิมทั้งหมด

## ความปลอดภัยและการดูแลระบบ

- ไม่แสดง raw exception, secret, private key หรือ stack trace ต่อผู้ใช้
- ตรวจ CORS/CSP/headers, route fallback และ retry/error boundary โดยไม่ปิด
  security control เพื่อแก้ปัญหาเฉพาะหน้า
- แก้ lint/type/build errors ในไฟล์ที่อยู่ใน scope; ห้ามแก้หรือ stage ไฟล์
  untracked ของผู้ใช้โดยไม่จำเป็น
- ไม่เพิ่มหรือรันทดสอบ automated เว้นแต่ผู้ใช้ขอ; ใช้ typecheck/build/lint,
  audit, preview และ browser verification ที่จำเป็นต่อการเปลี่ยนแปลง

## ขั้นตอนส่งมอบ

1. เขียนผล audit ปัจจุบันและ acceptance criteria สั้น ๆ ก่อนแก้ แต่ทำงานต่อทันที
2. แก้ปัญหาที่เลือกจน flow ครบ ไม่ส่งเพียง prototype หรือคำแนะนำ
3. รัน build และ audit ที่เกี่ยวข้อง ดู diff/status รวมทั้งรักษา untracked changes
4. ตรวจ preview/production ด้วย keyboard, language และ viewport ที่ตรงกับ scope
   แล้วบันทึกข้อจำกัดที่ยังเหลือ
5. Push/deploy เฉพาะเมื่อมีคำสั่งหรือ authorization จากผู้ใช้ที่ยังใช้ได้ ตรวจ
   deployment source, HTTP response, asset hash และหน้า production หลังปล่อย
6. อัปเดต verification log โดยระบุแยกชัดเจน: แก้ในเครื่อง, audit/build ผ่าน,
   commit, push, deploy และ production verification

## เกณฑ์รับงาน

- ไม่มีปัญหา P0/P1 ที่พบในรอบ audit ค้างโดยไม่มีเหตุผลหรือทางแก้ที่ระบุชัด
- หน้าและข้อความที่แก้รองรับไทย/อังกฤษ รวม aria-label/alt/สถานะ dynamic
- ภาพ error/missing ไม่หลอกว่าเป็นภาพจริง และผู้ใช้เข้าใจสถานะได้
- keyboard, focus, reduced motion และ mobile flow ที่อยู่ใน scope ใช้ได้
- build ผ่าน; audit ที่เกี่ยวข้องผ่านหรือรายงาน failure ที่เกิดจากข้อมูลจริง
- รายงาน gap ที่ยังไม่ปิดและตัวเลขจาก audit ล่าสุด ห้ามประกาศเสร็จทั้งเว็บถ้ายังมี
  acceptance criteria ค้าง
