import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const activityPath = path.join(root, "src/data/activity-directory.json");
const coversPath = path.join(root, "src/data/directory-covers.json");
const assetDir = path.join(root, "public/covers/nakhon-pathom");
await fs.mkdir(assetDir, { recursive: true });
const activity = JSON.parse(await fs.readFile(activityPath, "utf8"));
const covers = JSON.parse(await fs.readFile(coversPath, "utf8"));

const province = "นครปฐม";
const places = [
  {
    name: "ตลาดโบราณ 100 ปี รางกระทุ่ม",
    district: "บางเลน",
    categories: ["community", "nakhon-pathom"],
    sourceUrl: "https://www.thailandpostmart.com/news/244",
    description: "ย่านตลาดริมน้ำเก่าของชุมชนบางเลน มีอาคารไม้และบรรยากาศตลาดท้องถิ่น เหมาะเดินดูวิถีชุมชนและเลือกชิมอาหารพื้นบ้าน",
    address: "ตำบลบางภาษี อำเภอบางเลน นครปฐม",
    phone: "083-496-2295",
    visitNote: "ตรวจสอบวันเปิดตลาดและร้านค้าก่อนเดินทาง",
    image: "https://www.thailandpostmart.com/files/news_event_editor/20170803171624.jpg",
    imageSource: "https://www.thailandpostmart.com/",
    credit: "Thailand PostMart",
  },
  {
    name: "วัดกลางบางพระ",
    district: "บางเลน",
    categories: ["temple", "nakhon-pathom"],
    sourceUrl: "https://www.watklangbangphra.com/about",
    description: "วัดสำคัญของอำเภอบางเลน เป็นที่ประดิษฐานหลวงพ่อสมหวัง พระพุทธรูปองค์ใหญ่ที่เป็นจุดสักการะและภาพจำของวัด",
    visitNote: "เป็นศาสนสถาน โปรดแต่งกายสุภาพ รักษาความสงบ และปฏิบัติตามข้อแนะนำของวัด",
    image: "https://static.wixstatic.com/media/73cdb2_41c165209680450a96e6862cbd640f93~mv2.jpg/v1/fill/w_2500%2Ch_1667%2Cal_c/73cdb2_41c165209680450a96e6862cbd640f93~mv2.jpg",
    imageSource: "https://www.watklangbangphra.com/about",
    credit: "วัดกลางบางพระ",
  },
  {
    name: "ต้นยางยักษ์ - ยางสามยอด",
    district: "กำแพงแสน",
    categories: ["nature", "community", "nakhon-pathom"],
    sourceUrl: "https://www.banyang-npt.go.th/",
    lat: 13.84266,
    lon: 99.938758,
    description: "ต้นยางสามยอดขนาดใหญ่ที่ชุมชนบ้านยางดูแลและผูกพันมาหลายชั่วอายุคน จุดเด่นคือทรงพุ่มและลำต้นขนาดใหญ่ พร้อมศาลปู่ยางสามยอดใกล้บริเวณต้นไม้",
    visitNote: "กรุณาไม่ปีนต้นไม้หรือรบกวนศาลและพื้นที่ชุมชน หากมีพิธีให้เว้นพื้นที่ตามคำแนะนำของคนในชุมชน",
    image: "https://www.banyang-npt.go.th/site/images/stories/416172.jpg",
    imageSource: "https://www.banyang-npt.go.th/",
    credit: "องค์การบริหารส่วนตำบลบ้านยาง",
  },
  {
    name: "วัดทุ่งกระพังโหม",
    district: "กำแพงแสน",
    categories: ["temple", "nakhon-pathom"],
    sourceUrl: "https://travel.trueid.net/detail/AMEbV8w7EE8d",
    lat: 14.045137,
    lon: 99.990258,
    phone: "091-723-4159",
    description: "วัดในตำบลทุ่งกระพังโหมที่มีพระพุทธรูปองค์ใหญ่เป็นจุดสังเกตสำคัญของพื้นที่ ภาพปกเป็นมุมองค์พระและบริเวณวัด",
    visitNote: "สอบถามทางวัดก่อนเข้าชมอาคารหรือพื้นที่ที่มีการประกอบพิธี",
    image: "https://cms.dmpcdn.com/travel/2023/06/05/216fa0f0-0368-11ee-b2b7-35ead9314216_webp_original.webp",
    imageSource: "https://travel.trueid.net/detail/AMEbV8w7EE8d",
    credit: "TrueID Travel",
  },
  {
    name: "วัดบ้านยาง",
    district: "เมืองนครปฐม",
    categories: ["temple", "nakhon-pathom"],
    sourceUrl: "https://www.xn--72cga3cbo8cg9b4c4etb0g3ef.com/place/detail/9",
    lat: 13.845752,
    lon: 99.922803,
    description: "วัดชุมชนบ้านยางในอำเภอเมืองนครปฐม เป็นจุดแวะสักการะและเรียนรู้เส้นทางท่องเที่ยวชุมชนบ้านยางที่เชื่อมกับต้นยางสามยอด",
    visitNote: "แต่งกายสุภาพและหลีกเลี่ยงการถ่ายภาพในพื้นที่ประกอบพิธีโดยไม่ได้รับอนุญาต",
    image: "https://assets.xn--72cga3cbo8cg9b4c4etb0g3ef.com/upload/place/09/21/img_place_WL6yXLVfjx.jpg",
    imageSource: "https://www.xn--72cga3cbo8cg9b4c4etb0g3ef.com/place/detail/9",
    credit: "ท่องเที่ยวชุมชน นครปฐม",
  },
  {
    name: "วัดห้วยม่วง",
    district: "กำแพงแสน",
    categories: ["temple", "nakhon-pathom"],
    sourceUrl: "https://huaimuang.go.th/public/list/data/detail/id/2787/menu/1173/page/1",
    lat: 14.128137,
    lon: 100.040799,
    phone: "093-124-5524",
    description: "วัดเก่าในพื้นที่กำแพงแสน จุดเด่นคืออุโบสถเก่าที่มีอายุราว 150 ปี ซึ่งสะท้อนงานช่างและประวัติชุมชน",
    visitNote: "ตรวจสอบก่อนเข้าชมอุโบสถ เนื่องจากอาจมีการใช้ประกอบพิธีหรือปิดบูรณะ",
    image: "https://huaimuang.go.th/public/list_upload/backend/list_2787/pics_topic_2787.jpg",
    imageSource: "https://huaimuang.go.th/public/list/data/detail/id/2787/menu/1173/page/1",
    credit: "องค์การบริหารส่วนตำบลห้วยม่วง",
  },
  {
    name: "วัดรัตนรังสี",
    district: "เมืองนครปฐม",
    categories: ["temple", "nakhon-pathom"],
    sourceUrl: "https://www.xn--72cga3cbo8cg9b4c4etb0g3ef.com/place/detail/32",
    lat: 13.886947,
    lon: 99.958074,
    description: "วัดประจำชุมชนโพรงมะเดื่อในอำเภอเมืองนครปฐม เป็นอีกจุดแวะในเส้นทางท่องเที่ยวชุมชนและไหว้พระในพื้นที่",
    visitNote: "โปรดแต่งกายสุภาพและให้ความสำคัญกับกิจกรรมทางศาสนาของชุมชน",
    image: "https://assets.xn--72cga3cbo8cg9b4c4etb0g3ef.com/upload/place/09/22/img_place_c5P9hfqrHx.jpg",
    imageSource: "https://www.xn--72cga3cbo8cg9b4c4etb0g3ef.com/place/detail/32",
    credit: "ท่องเที่ยวชุมชน นครปฐม",
  },
  {
    name: "วัดกงลาด",
    district: "ดอนตูม",
    categories: ["temple", "community", "nakhon-pathom"],
    sourceUrl: "https://www.xn--72cga3cbo8cg9b4c4etb0g3ef.com/place/detail/41",
    lat: 13.891598,
    lon: 100.089609,
    description: "วัดเก่าแก่ที่เชื่อมโยงกับชุมชนลาวครั่งบ้านห้วยด้วน มีงานประเพณีและกิจกรรมวัฒนธรรมท้องถิ่นในช่วงสงกรานต์",
    visitNote: "การจัดงานประเพณีเป็นไปตามกำหนดของชุมชนในแต่ละปี ควรตรวจสอบวันจัดงานก่อนเดินทาง",
    image: "https://assets.xn--72cga3cbo8cg9b4c4etb0g3ef.com/upload/place/09/22/img_place_J6fOgYwr3W.JPG",
    imageSource: "https://www.xn--72cga3cbo8cg9b4c4etb0g3ef.com/place/detail/41",
    credit: "ท่องเที่ยวชุมชน นครปฐม",
  },
  {
    name: "วัดงิ้วราย",
    district: "นครชัยศรี",
    categories: ["temple", "community", "nakhon-pathom"],
    sourceUrl: "https://www.xn--72cga3cbo8cg9b4c4etb0g3ef.com/place/detail/45",
    lat: 13.808679,
    lon: 100.220757,
    description: "วัดริมแม่น้ำนครชัยศรีในชุมชนงิ้วราย เป็นจุดแวะคู่กับสถานีรถไฟวัดงิ้วรายและเส้นทางล่องเรือชมชุมชน",
    visitNote: "รักษาความสงบในเขตวัด และระมัดระวังเมื่อเดินบริเวณริมน้ำ",
    image: "https://assets.xn--72cga3cbo8cg9b4c4etb0g3ef.com/upload/place/09/22/img_place_IyTfUFNVQb.jpg",
    imageSource: "https://www.xn--72cga3cbo8cg9b4c4etb0g3ef.com/place/detail/45",
    credit: "ท่องเที่ยวชุมชน นครปฐม",
  },
  {
    name: "สถานีรถไฟวัดงิ้วราย",
    district: "นครชัยศรี",
    categories: ["community", "art", "nakhon-pathom"],
    sourceUrl: "https://www.xn--72cga3cbo8cg9b4c4etb0g3ef.com/place/detail/47",
    lat: 13.8078,
    lon: 100.216,
    description: "สถานีรถไฟท้องถิ่นในชุมชนงิ้วราย เชื่อมต่อบรรยากาศสถานีเก่ากับวิถีริมแม่น้ำและวัดในละแวกเดียวกัน",
    visitNote: "ตรวจสอบตารางเดินรถของการรถไฟฯ ก่อนเดินทาง และถ่ายภาพจากพื้นที่สาธารณะโดยไม่กีดขวางผู้โดยสาร",
    image: "https://assets.xn--72cga3cbo8cg9b4c4etb0g3ef.com/upload/place/09/22/img_place_4q2CDB7kBA.jpg",
    imageSource: "https://www.xn--72cga3cbo8cg9b4c4etb0g3ef.com/place/detail/47",
    credit: "ท่องเที่ยวชุมชน นครปฐม",
  },
  {
    name: "วัดเกาะแรต",
    district: "บางเลน",
    categories: ["temple", "community", "nakhon-pathom"],
    sourceUrl: "https://www.xn--72cga3cbo8cg9b4c4etb0g3ef.com/place/detail/61",
    description: "วัดเก่าในชุมชนบางเลน มีศาลาไม้สักเก่าเป็นเอกลักษณ์และมีเรื่องราวเชื่อมโยงกับชุมชนเกาะแรต",
    visitNote: "ขออนุญาตก่อนถ่ายภาพภายในอาคารหรือในช่วงที่มีพิธีกรรม",
    image: "https://assets.xn--72cga3cbo8cg9b4c4etb0g3ef.com/upload/place/09/22/img_place_eWZsP7SIdU.jpg",
    imageSource: "https://www.xn--72cga3cbo8cg9b4c4etb0g3ef.com/place/detail/61",
    credit: "ท่องเที่ยวชุมชน นครปฐม",
  },
  {
    name: "บรอมมีเลียด ฟาร์ม คาเฟ่",
    district: "พุทธมณฑล",
    categories: ["nature", "farm", "nakhon-pathom"],
    sourceUrl: "https://www.xn--72cga3cbo8cg9b4c4etb0g3ef.com/place/detail/24",
    lat: 13.70613,
    lon: 100.212397,
    openingHours: "09:00–18:00 น. (วันจันทร์ครัวปิด)",
    phone: "094-519-4654",
    description: "สวนพรรณไม้และคาเฟ่ที่รวบรวมบรอมมีเลียดกับกล้วยไม้ มีมุมเดินชมพืชและนั่งพักในบรรยากาศสวน",
    visitNote: "เวลาให้บริการครัวอาจต่างจากเวลาเข้าสวน ควรโทรสอบถามก่อนเดินทาง",
    image: "https://assets.xn--72cga3cbo8cg9b4c4etb0g3ef.com/upload/place/09/21/img_place_Y9RJdeAejI.jpg",
    imageSource: "https://www.xn--72cga3cbo8cg9b4c4etb0g3ef.com/place/detail/24",
    credit: "ท่องเที่ยวชุมชน นครปฐม",
  },
  {
    name: "บ้านสวนบางเตย",
    district: "สามพราน",
    categories: ["nature", "community", "nakhon-pathom"],
    sourceUrl: "https://www.xn--72cga3cbo8cg9b4c4etb0g3ef.com/place/detail/21",
    lat: 13.769638,
    lon: 100.281586,
    address: "9 หมู่ 5 ตำบลบางเตย อำเภอสามพราน นครปฐม 73210",
    phone: "081-659-5805",
    description: "บ้านพักและเรือนไทยริมน้ำในย่านสวนผลไม้บางเตย เหมาะสำหรับวางแผนพักผ่อนหรือกิจกรรมชุมชนทางน้ำเมื่อจองล่วงหน้า",
    visitNote: "เป็นที่พัก/พื้นที่ให้บริการ กรุณาติดต่อจองและสอบถามกิจกรรมก่อนเข้าใช้พื้นที่",
    image: "https://assets.xn--72cga3cbo8cg9b4c4etb0g3ef.com/upload/place/09/21/img_place_ItR3jzR4Gl.jpg",
    imageSource: "https://www.xn--72cga3cbo8cg9b4c4etb0g3ef.com/place/detail/21",
    credit: "ท่องเที่ยวชุมชน นครปฐม",
  },
  {
    name: "ศาลเจ้าพ่อไทยทรงดำ",
    district: "บางเลน",
    categories: ["community", "nakhon-pathom"],
    sourceUrl: "https://www.xn--72cga3cbo8cg9b4c4etb0g3ef.com/place/detail/62",
    description: "สถานที่ศรัทธาของชุมชนไทยทรงดำในอำเภอบางเลน เป็นจุดเรียนรู้วัฒนธรรมและความเชื่อที่ยังมีชีวิตของคนในท้องถิ่น",
    visitNote: "ควรติดต่อชุมชนก่อนเข้าชม ขออนุญาตก่อนถ่ายภาพ และหลีกเลี่ยงการรบกวนช่วงประกอบพิธี",
    image: "https://assets.xn--72cga3cbo8cg9b4c4etb0g3ef.com/upload/place/09/22/img_place_3KDADf6YDH.jpg",
    imageSource: "https://www.xn--72cga3cbo8cg9b4c4etb0g3ef.com/place/detail/62",
    credit: "ท่องเที่ยวชุมชน นครปฐม",
  },
  {
    name: "วัดห้วยตะโกและพิพิธภัณฑ์พื้นบ้าน",
    district: "นครชัยศรี",
    categories: ["temple", "art", "nakhon-pathom"],
    sourceUrl: "https://museum-central.sac.or.th/wathuaytako.php",
    description: "วัดเก่าแก่ในตำบลพะเนียด โดดเด่นด้วยอุโบสถที่ผสมแรงบันดาลใจศิลปะเขมร ภายในพื้นที่มีพิพิธภัณฑ์พื้นบ้านจัดแสดงเครื่องมือเกษตร งานจักสาน และโบราณวัตถุชุมชน",
    visitNote: "เวลาเปิดพิพิธภัณฑ์อาจไม่ตรงกับเวลาเปิดวัด โปรดติดต่อวัดหรือชุมชนก่อนเดินทาง",
    image: "https://wikicommunity.sac.or.th/files/community/1410/attach/large-65bb4bec7f0d0.jpg",
    imageSource: "https://wikicommunity.sac.or.th/community/1410",
    credit: "ศูนย์มานุษยวิทยาสิรินธร · WikiCommunity",
  },
  {
    name: "ปางอุ๋ง Iberry Cafe & Restaurant",
    district: "เมืองนครปฐม",
    categories: ["nature", "community", "nakhon-pathom"],
    sourceUrl: "https://www.xn--72cga3cbo8cg9b4c4etb0g3ef.com/place/detail/29",
    description: "คาเฟ่และร้านอาหารริมบึงที่จัดพื้นที่เป็นสวน มีมุมมองผืนน้ำและแนวต้นไม้เป็นเอกลักษณ์ เหมาะกับการนั่งพักและถ่ายภาพช่วงแสงเย็น",
    visitNote: "ตรวจสอบวันเปิดและการให้บริการล่าสุดกับร้านก่อนเดินทาง",
    image: "https://assets.xn--72cga3cbo8cg9b4c4etb0g3ef.com/upload/place/09/21/img_place_ibhdbHR43I.jpg",
    imageSource: "https://www.xn--72cga3cbo8cg9b4c4etb0g3ef.com/place/detail/29",
    credit: "ท่องเที่ยวชุมชน นครปฐม",
  },
  {
    name: "บ้านฟักข้าวขนิษฐา",
    district: "พุทธมณฑล",
    categories: ["farm", "community", "nakhon-pathom"],
    sourceUrl: "https://www.xn--72cga3cbo8cg9b4c4etb0g3ef.com/place/detail/7",
    lat: 13.807063,
    lon: 100.280044,
    openingHours: "08:00–18:00 น.",
    phone: "081-902-4516",
    description: "แหล่งเรียนรู้และสวนชุมชนริมคลองมหาสวัสดิ์ มีซุ้มฟักข้าว เครื่องดื่มและผลิตภัณฑ์จากฟักข้าว พร้อมกิจกรรมข้าวตังและจุดติดต่อเรือล่องชมสวน",
    visitNote: "สอบถามการล่องเรือและกิจกรรมก่อนเดินทาง",
    image: "https://assets.xn--72cga3cbo8cg9b4c4etb0g3ef.com/upload/place/09/21/img_place_XoLirGCkLG.jpg",
    imageSource: "https://www.xn--72cga3cbo8cg9b4c4etb0g3ef.com/place/detail/7",
    credit: "ท่องเที่ยวชุมชน นครปฐม",
  },
  {
    name: "เกรส ก๋วยเตี๋ยวต้มยำโบราณ 100 ปี",
    district: "พุทธมณฑล",
    categories: ["community", "nakhon-pathom"],
    sourceUrl: "https://www.xn--72cga3cbo8cg9b4c4etb0g3ef.com/place/detail/2",
    lat: 13.806757,
    lon: 100.28492,
    address: "143 ซอยศาลายา 1/1 ตำบลมหาสวัสดิ์ อำเภอพุทธมณฑล นครปฐม 73170",
    openingHours: "08:00–15:00 น.",
    phone: "084-664-3368",
    description: "ร้านก๋วยเตี๋ยวต้มยำสูตรโบราณริมคลองมหาสวัสดิ์ มีเครื่องดื่มแบบร้านกาแฟดั้งเดิม และเป็นจุดติดต่อเรือชมสวนของชุมชน",
    visitNote: "เวลาเปิดจากข้อมูลชุมชน ควรโทรยืนยันก่อนเดินทาง",
    image: "https://assets.xn--72cga3cbo8cg9b4c4etb0g3ef.com/upload/place/09/21/img_place_lojSJYtSEF.jpg",
    imageSource: "https://www.xn--72cga3cbo8cg9b4c4etb0g3ef.com/place/detail/2",
    credit: "ท่องเที่ยวชุมชน นครปฐม",
  },
  {
    name: "ครัวป้าเล็ก เตี๋ยวกับตำ",
    district: "เมืองนครปฐม",
    categories: ["community", "nakhon-pathom"],
    sourceUrl: "https://www.xn--72cga3cbo8cg9b4c4etb0g3ef.com/place/detail/10",
    address: "39 หมู่ 3 ตำบลบ้านยาง อำเภอเมืองนครปฐม นครปฐม 73000",
    openingHours: "09:30–16:30 น.",
    phone: "086-373-3711",
    description: "ร้านอาหารท้องถิ่นในย่านบ้านยาง มีทั้งก๋วยเตี๋ยว ส้มตำ ผัดไทย อาหารจานเดียว และกาแฟสด",
    visitNote: "พิกัดจากหน้าข้อมูลชุมชนไม่ตรงกับที่อยู่ จึงเปิดแผนที่ด้วยชื่อร้านและแนะนำให้โทรยืนยันตำแหน่ง",
    image: "https://assets.xn--72cga3cbo8cg9b4c4etb0g3ef.com/upload/place/09/21/img_place_C0AgVfqbh4.jpg",
    imageSource: "https://www.xn--72cga3cbo8cg9b4c4etb0g3ef.com/place/detail/10",
    credit: "ท่องเที่ยวชุมชน นครปฐม",
  },
  {
    name: "บ้านสวนช้างน้อย",
    district: "สามพราน",
    categories: ["nature", "community", "nakhon-pathom"],
    sourceUrl: "https://www.xn--72cga3cbo8cg9b4c4etb0g3ef.com/place/detail/20",
    lat: 13.772405,
    lon: 100.268534,
    address: "34 หมู่ 3 ตำบลบางเตย อำเภอสามพราน นครปฐม 73210",
    openingHours: "09:00–19:00 น.",
    phone: "081-587-6824, 061-914-9559",
    description: "ร้านอาหารในสวนบางเตย บรรยากาศร่มรื่น มีเมนูจากวัตถุดิบท้องถิ่นและมุมรับประทานอาหารกลางสวน",
    visitNote: "เป็นร้านอาหารเอกชน โปรดตรวจสอบเวลาเปิดและสำรองโต๊ะในวันหยุด",
    image: "https://assets.xn--72cga3cbo8cg9b4c4etb0g3ef.com/upload/place/09/21/img_place_huOaFIwVR9.jpg",
    imageSource: "https://www.xn--72cga3cbo8cg9b4c4etb0g3ef.com/place/detail/20",
    credit: "ท่องเที่ยวชุมชน นครปฐม",
  },
  {
    name: "มาดิ่ (MADi cafe and bistro)",
    district: "สามพราน",
    categories: ["nature", "community", "nakhon-pathom"],
    sourceUrl: "https://www.xn--72cga3cbo8cg9b4c4etb0g3ef.com/place/detail/22",
    lat: 13.752935,
    lon: 100.277205,
    openingHours: "10:00–17:30 น.",
    phone: "064-261-6479",
    description: "คาเฟ่และบิสโทรริมแม่น้ำนครชัยศรีในย่านไร่ขิง มีเมนูทั้งมังสวิรัติและอาหารทั่วไป พร้อมวิวแม่น้ำและเรือที่แล่นผ่าน",
    visitNote: "ตรวจสอบวันเปิดและเมนูกับร้านก่อนเดินทาง",
    image: "https://assets.xn--72cga3cbo8cg9b4c4etb0g3ef.com/upload/place/09/21/img_place_DuiL1qovIA.jpg",
    imageSource: "https://www.xn--72cga3cbo8cg9b4c4etb0g3ef.com/place/detail/22",
    credit: "ท่องเที่ยวชุมชน นครปฐม",
  },
  {
    name: "ร้านอาหารเครื่องบิน นครปฐม",
    district: "เมืองนครปฐม",
    categories: ["nature", "community", "nakhon-pathom"],
    sourceUrl: "https://www.xn--72cga3cbo8cg9b4c4etb0g3ef.com/place/detail/30",
    lat: 13.83358,
    lon: 100.026222,
    address: "ตำบลหนองปากโลง อำเภอเมืองนครปฐม นครปฐม 73000",
    openingHours: "10:00–21:00 น.",
    phone: "098-559-1491, 082-336-6618",
    description: "แฮงการ์คาเฟ่และร้านอาหารริมบึง จุดถ่ายภาพมีเครื่องบินและอุปกรณ์ทหารจัดแสดง พร้อมพื้นที่นั่งหลายโซนและวิวบึงน้ำ",
    visitNote: "สถานที่เอกชน เวลาและโซนให้บริการอาจเปลี่ยนได้ โทรยืนยันก่อนเดินทาง",
    image: "https://assets.xn--72cga3cbo8cg9b4c4etb0g3ef.com/upload/place/09/21/img_place_IUX7aElR0j.jpg",
    imageSource: "https://www.xn--72cga3cbo8cg9b4c4etb0g3ef.com/place/detail/30",
    credit: "ท่องเที่ยวชุมชน นครปฐม",
  },
  {
    name: "Amber Terrace",
    district: "ดอนตูม",
    categories: ["nature", "community", "nakhon-pathom"],
    sourceUrl: "https://www.xn--72cga3cbo8cg9b4c4etb0g3ef.com/place/detail/38",
    lat: 13.928414,
    lon: 100.088981,
    address: "60/3 หมู่ 1 ตำบลห้วยพระ อำเภอดอนตูม นครปฐม 73150",
    openingHours: "09:00–20:00 น. (ปิดวันพฤหัสบดี)",
    phone: "095-551-4716, 085-677-7727",
    description: "คาเฟ่และร้านอาหารท่ามกลางสวนร่มรื่น มีมุมกาแฟ เบเกอรี่ และพื้นที่รับประทานอาหารใต้ร่มไม้",
    visitNote: "วันหยุดและเวลาอ้างอิงจากข้อมูลชุมชน ควรเช็กกับร้านก่อนออกเดินทาง",
    image: "https://assets.xn--72cga3cbo8cg9b4c4etb0g3ef.com/upload/place/09/22/img_place_ejxzXTxP2E.jpg",
    imageSource: "https://www.xn--72cga3cbo8cg9b4c4etb0g3ef.com/place/detail/38",
    credit: "ท่องเที่ยวชุมชน นครปฐม",
  },
  {
    name: "สวนมะลิ ดอนตูม",
    district: "ดอนตูม",
    categories: ["nature", "farm", "community", "nakhon-pathom"],
    sourceUrl: "https://www.xn--72cga3cbo8cg9b4c4etb0g3ef.com/place/detail/40",
    lat: 13.908499,
    lon: 100.10525,
    description: "สวนเกษตรในชุมชนห้วยด้วนที่เปิดให้เรียนรู้วิธีเก็บดอกมะลิและวิถีการปลูกพืชของท้องถิ่น",
    visitNote: "เป็นพื้นที่สวนทำงาน กรุณาติดต่อหรือขออนุญาตชุมชนก่อนเข้าชม และตรวจสอบฤดูกาลออกดอก",
    image: "https://assets.xn--72cga3cbo8cg9b4c4etb0g3ef.com/upload/place/09/22/img_place_GruRl5YnJK.JPG",
    imageSource: "https://www.xn--72cga3cbo8cg9b4c4etb0g3ef.com/place/detail/40",
    credit: "ท่องเที่ยวชุมชน นครปฐม",
  },
  {
    name: "บ้านโรงหวด",
    district: "นครชัยศรี",
    categories: ["art", "community", "nakhon-pathom"],
    sourceUrl: "https://www.xn--72cga3cbo8cg9b4c4etb0g3ef.com/place/detail/46",
    lat: 13.80419,
    lon: 100.22447,
    address: "76/3 หมู่ 2 ตำบลงิ้วราย อำเภอนครชัยศรี นครปฐม 73120",
    phone: "089-768-4746",
    description: "ชุมชนช่างปั้นเครื่องดินเผาเก่าแก่ของงิ้วราย มีเรื่องราวงานช่างและภาชนะดินเผาที่สืบทอดในท้องถิ่น",
    visitNote: "ติดต่อชุมชนก่อนเข้าชมบ้านช่างหรือพื้นที่ทำงาน และสอบถามว่ามีกิจกรรมสาธิตในวันที่ไปหรือไม่",
    image: "https://assets.xn--72cga3cbo8cg9b4c4etb0g3ef.com/upload/place/09/22/img_place_TaxnmcfLKW.jpg",
    imageSource: "https://www.xn--72cga3cbo8cg9b4c4etb0g3ef.com/place/detail/46",
    credit: "ท่องเที่ยวชุมชน นครปฐม",
  },
  {
    name: "Home No.8",
    district: "นครชัยศรี",
    categories: ["community", "nakhon-pathom"],
    sourceUrl: "https://www.xn--72cga3cbo8cg9b4c4etb0g3ef.com/place/detail/51",
    lat: 13.816917,
    lon: 100.193858,
    address: "ตำบลงิ้วราย อำเภอนครชัยศรี นครปฐม 73120",
    openingHours: "09:00–16:00 น.",
    phone: "086-614-2423",
    description: "คาเฟ่ขนาดเล็กในบ้านที่เน้นกาแฟดริปและเมล็ดคั่วตามสูตรของร้าน อยู่ไม่ไกลจากเจษฎา เทคนิค มิวเซียม",
    visitNote: "เป็นร้านขนาดเล็ก โทรสอบถามวันเปิดและเมล็ดกาแฟก่อนเดินทาง",
    image: "https://xn--72cga3cbo8cg9b4c4etb0g3ef.com/assets/upload/place/02/19/img_place_2TdPd3Lmr0.jpg",
    imageSource: "https://www.xn--72cga3cbo8cg9b4c4etb0g3ef.com/place/detail/51",
    credit: "ท่องเที่ยวชุมชน นครปฐม",
  },
  {
    name: "พิพิธภัณฑ์วิถีชีวิตชาวนาไทยบ้านลานแหลม",
    district: "นครชัยศรี",
    categories: ["community", "farm", "nakhon-pathom"],
    sourceUrl: "https://cbtthailand.dasta.or.th/webapp/relattraction/content/897/",
    address: "ตำบลวัดละมุด อำเภอนครชัยศรี นครปฐม 73120",
    openingHours: "ข้อมูลชุมชนระบุ 08:30–17:00 น. ทุกวัน",
    phone: "034-296-086, 081-991-6084",
    description: "พิพิธภัณฑ์ชุมชนในเรือนไทยเครื่องผูก จัดแสดงเครื่องมือทำนาและของใช้พื้นบ้าน พร้อมสาธิตการสีข้าว ฝัดข้าว และงานจักสานผักตบชวาลายทวารวดี",
    visitNote: "ข้อมูลเวลาและโทรศัพท์มาจากรายการท่องเที่ยวชุมชนที่อาจปรับเปลี่ยน กรุณาโทรยืนยันก่อนเดินทางหรือเข้าชมเป็นหมู่คณะ",
    image: "https://museum-central.sac.or.th/img/thachin/lanlaem/SAC-20201119-240.jpg",
    imageSource: "https://museum-central.sac.or.th/lanlaem.php",
    credit: "ศูนย์มานุษยวิทยาสิรินธร · มหกรรมพิพิธภัณฑ์ท้องถิ่นภาคกลาง",
  },
  {
    name: "พิพิธภัณฑ์วัดกำแพงแสน",
    district: "กำแพงแสน",
    categories: ["temple", "art", "nakhon-pathom"],
    sourceUrl: "https://www.museumthailand.com/museum/info-wat-kamphaeng-saen-museum",
    lat: 13.994358,
    lon: 99.948381,
    address: "61 ถนน อบจ. นฐ. 0017 (ค่ายลูกเสือ-กำแพงแสน) ตำบลห้วยหมอนทอง อำเภอกำแพงแสน นครปฐม 73140",
    openingHours: "08:00–17:00 น. ทุกวัน (ข้อมูล Museum Thailand)",
    phone: "080-857-7465",
    description: "พิพิธภัณฑ์ท้องถิ่นภายในวัด จัดแสดงโบราณวัตถุเมืองกำแพงแสนสมัยทวารวดี เศษปูนปั้นและชิ้นส่วนสถาปัตยกรรม รวมถึงภาชนะดินเผา เครื่องใช้พื้นบ้าน และพระพิมพ์",
    visitNote: "พิพิธภัณฑ์อยู่ในเขตวัด โปรดแต่งกายสุภาพ และโทรสอบถามก่อนเดินทางหากต้องการเข้าชมภายในอาคาร",
    image: "https://www.museumthailand.com/storage/upload/cover/1534936026_2905.jpg",
    imageSource: "https://www.museumthailand.com/museum/info-wat-kamphaeng-saen-museum",
    credit: "Museum Thailand",
  },
  {
    name: "พิพิธภัณฑ์จ่าง แซ่ตั้ง",
    district: "สามพราน",
    categories: ["art", "community", "nakhon-pathom"],
    sourceUrl: "https://tangchangmuseum.com/",
    address: "29/5 หมู่ 2 ตำบลบางกระทึก อำเภอสามพราน นครปฐม 73210",
    phone: "082-414-4592, 081-839-0212",
    description: "พิพิธภัณฑ์ส่วนบุคคลในบ้านสองชั้นกึ่งไม้กึ่งปูน เก็บและจัดแสดงผลงานจิตรกรรมกับเอกสารของศิลปินจ่าง แซ่ตั้ง โดยมีภาพขนาดใหญ่เรียงตามพัฒนาการงานศิลป์บริเวณโถงบันได",
    visitNote: "เป็นพิพิธภัณฑ์ส่วนบุคคล ต้องติดต่อนัดหมายล่วงหน้าก่อนเข้าเยี่ยมชม",
    image: "https://tangchangmuseum.com/content/images/2026/08/IMG_8066.jpeg",
    imageSource: "https://tangchangmuseum.com/",
    credit: "พิพิธภัณฑ์จ่าง แซ่ตั้ง",
  },
];

async function saveCover(place) {
  const key = `${place.name}|${province}`;
  const file = `${crypto.createHash("sha256").update(key).digest("hex").slice(0, 16)}.webp`;
  const response = await fetch(place.image, {
    signal: AbortSignal.timeout(30000),
    headers: { "user-agent": "FramehuntThailand/1.0 location directory" },
  });
  if (!response.ok) throw new Error(`${place.name}: image HTTP ${response.status}`);
  const input = Buffer.from(await response.arrayBuffer());
  if (!response.headers.get("content-type")?.startsWith("image/")) throw new Error(`${place.name}: URL did not return an image`);
  const metadata = await sharp(input).metadata();
  if (!metadata.width || !metadata.height || metadata.width < 220 || metadata.height < 140) {
    throw new Error(`${place.name}: image too small (${metadata.width}x${metadata.height})`);
  }
  const optimized = await sharp(input)
    .rotate()
    .resize({ width: 1200, height: 800, fit: "cover", position: "attention" })
    .webp({ quality: 84 })
    .toBuffer();
  await fs.writeFile(path.join(assetDir, file), optimized);
  covers[key] = { url: `/covers/nakhon-pathom/${file}`, source: place.imageSource, credit: place.credit };
}

let added = 0;
for (const place of places) {
  const duplicate = activity.places.some((item) => item.province === province && item.name.normalize("NFC") === place.name.normalize("NFC"));
  if (duplicate) continue;
  await saveCover(place);
  const { image, imageSource, credit, ...record } = place;
  activity.places.push({ ...record, province });
  added++;
}

// Enrich the existing Baan Rung Nok card with its current official community listing and local cover.
const existingMarket = activity.places.find((place) => place.province === province && place.name === "ตลาดบ้านรังนก");
if (!existingMarket) throw new Error("Expected existing Baan Rung Nok listing was not found");
existingMarket.description = "คาเฟ่และตลาดชุมชนแนวรักษ์สิ่งแวดล้อม มีมุมศิลปะสำหรับเด็ก งานทำมือ และของมือสองที่นำรายได้สนับสนุนกิจกรรมของมูลนิธิ ตั้งอยู่ในอำเภอบางเลน";
existingMarket.address = "59 หมู่ 2 ตำบลคลองนกกระทุง อำเภอบางเลน นครปฐม 73130";
existingMarket.openingHours = "08:00–17:00 น. (ตรวจสอบวันเปิดอีกครั้งก่อนเดินทาง)";
existingMarket.phone = "063-224-1199";
existingMarket.visitNote = "เวลาเปิดอ้างอิงจากข้อมูลชุมชน กรุณาตรวจสอบกับสถานที่ก่อนเดินทาง";
existingMarket.sourceUrl = "https://www.xn--72cga3cbo8cg9b4c4etb0g3ef.com/place/detail/54";
await saveCover({
  name: existingMarket.name,
  image: "https://assets.xn--72cga3cbo8cg9b4c4etb0g3ef.com/upload/place/09/22/img_place_5HLJHffqEK.JPG",
  imageSource: "https://www.xn--72cga3cbo8cg9b4c4etb0g3ef.com/place/detail/54",
  credit: "ท่องเที่ยวชุมชน นครปฐม",
});

// Surface the documented folk-tools learning center within the existing Wat Pho Ngam listing.
const phoNgam = activity.places.find((place) => place.province === province && place.name === "วัดโพธิ์งาม");
if (phoNgam) {
  phoNgam.categories = [...new Set([...phoNgam.categories, "community"])];
  phoNgam.description = "ภายในวัดมีศูนย์อนุรักษ์ของใช้พื้นบ้านที่รวบรวมเครื่องมือเกษตร เครื่องจักสาน เครื่องมือจับปลา หนังสือเก่า และของใช้ในชีวิตประจำวันของชุมชนกำแพงแสน";
  phoNgam.address = "ตำบลกระตีบ อำเภอกำแพงแสน นครปฐม";
  phoNgam.phone = "034-383-867";
  phoNgam.visitNote = "ศูนย์ตั้งอยู่ในเขตวัดและโรงเรียน โปรดติดต่อสอบถามและนัดหมายก่อนเข้าชม";
  phoNgam.sourceUrl = "https://service.christian.ac.th/acs/museumnpk/";
}

activity.updated = new Date().toISOString().slice(0, 10);
await fs.writeFile(activityPath, `${JSON.stringify(activity, null, 2)}\n`);
await fs.writeFile(coversPath, `${JSON.stringify(covers, null, 2)}\n`);
console.log(`Added ${added} Nakhon Pathom places; enriched Baan Rung Nok. Total Nakhon Pathom: ${activity.places.filter((place) => place.province === province).length}.`);
