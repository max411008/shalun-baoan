/* 官網與後台唯一渲染來源。修改後執行 python3 tools/prepare_admin.py。 */
var BlockRenderer = (function () {
'use strict';
var DEFAULTS = [
 {
  "order": 1,
  "id": "hero",
  "style": "hero",
  "title": "沙崙保安宮",
  "subtitle": "桃園大園沙崙 · 主祀保安廣澤尊王 · 民國三十六年創建",
  "body": "",
  "photos": [
   {
    "src": "img/p24.jpg",
    "thumb": "img/p24.jpg",
    "alt": "沙崙保安宮廟貌",
    "caption": ""
   }
  ],
  "show": true,
  "navTitle": "",
  "data": {}
 },
 {
  "order": 2,
  "id": "facts",
  "style": "facts",
  "title": "",
  "subtitle": "",
  "body": "",
  "photos": [],
  "show": true,
  "navTitle": "",
  "data": {
   "items": [
    {
     "label": "主神",
     "value": "保安廣澤尊王"
    },
    {
     "label": "創建",
     "value": "民國三十六年（1947）"
    },
    {
     "label": "尊王誕辰",
     "value": "農曆二月廿二日"
    },
    {
     "label": "每年宮慶",
     "value": "農曆八月廿一日"
    }
   ]
  }
 },
 {
  "order": 3,
  "id": "newtemple",
  "style": "newtemple",
  "title": "興建新廟",
  "subtitle": "誠邀十方信眾共襄盛舉",
  "body": "舊廟因桃園航空城計畫列入徵收、將來拆除，管理委員會已在新廟預定地搭建臨時紅壇，暫奉保安廣澤尊王與眾神。為讓尊王早日安座新殿，保安宮正籌建新廟，懇請各方信士大德發心護持，共成功德。",
  "photos": [
   {
    "src": "img/newtemple.jpg",
    "thumb": "img/newtemple.jpg",
    "alt": "沙崙保安宮新廟完工示意圖",
    "caption": "沙崙保安宮新廟　完工示意圖"
   }
  ],
  "show": true,
  "navTitle": "建新廟",
  "data": {
   "donationTitle": "護持捐款",
   "progress": "",
   "bank": "",
   "accountName": "",
   "account": "",
   "note": "亦可至臨時紅壇（中央路 418 之一號）親自添緣",
   "phone": "03-383-6940",
   "photoSection": "建新廟"
  }
 },
 {
  "order": 4,
  "id": "news",
  "style": "news",
  "title": "最新消息",
  "subtitle": "法會活動與廟務公告",
  "body": "",
  "photos": [],
  "show": false,
  "navTitle": "消息",
  "data": {
   "photoSection": "活動"
  }
 },
 {
  "order": 5,
  "id": "history",
  "style": "history",
  "title": "沿革",
  "subtitle": "依廟內四方石碑整理",
  "body": "沙崙、竹圍、海口、後厝、三石、菓林一帶的先民，自古崇信保安廣澤尊王，結為「聖王公會」，按期輪值祭祀。民國三十六年正月，地方士紳陳全福、陳土金發起募捐，陳萬金捐出約三十坪土地，創建廟堂一殿，號曰「保安宮」。\n\n隨地方繁榮、舊廟狹小陳舊，民國六十五年正月由陳朝和、蔡嵩峯、許榮源、簡連鳳等信士倡議遷址擴建，經信徒大會贊同、組成重建委員會；同年興建後殿，六十六年前殿興工，六十八年完工。\n\n民國七十七年配合慶成建醮，興建歡迎牌樓、鐘鼓樓，八十一年舉行圓醮大典。九十一年起再以圓醮與拜斗會結餘及信眾油香，完成屋頂剪黏翻新、全殿木雕等八大項整建。九十六年更向法院標購一七六三地號土地七百餘坪，為保安宮留下長遠的發展空間。\n\n近年因桃園航空城計畫，舊廟列入徵收、將來拆除（目前尚未拆）。管理委員會已在新廟預定地搭建臨時紅壇，暫時安奉尊王與眾神；新廟落成後，神明將遷入新殿祭祀。",
  "photos": [],
  "show": true,
  "navTitle": "沿革",
  "data": {
   "timeline": [
    {
     "title": "民國 36 年（1947）",
     "body": "陳全福、陳土金發起，陳萬金捐地約 30 坪，創建廟堂一殿"
    },
    {
     "title": "民國 65 年（1976）",
     "body": "倡議遷址擴建，組重建委員會；興建後殿"
    },
    {
     "title": "民國 66–68 年（1977–79）",
     "body": "前殿興工，六十八年完工"
    },
    {
     "title": "民國 77 年（1988）",
     "body": "慶成建醮；興建歡迎牌樓、鐘鼓樓，增購廟地"
    },
    {
     "title": "民國 81 年（1992）",
     "body": "十一月舉行圓醮大典，續建金亭"
    },
    {
     "title": "民國 91–93 年（2002–04）",
     "body": "八大項整建，總經費一千五百二十餘萬元"
    },
    {
     "title": "民國 96 年（2007）",
     "body": "標購沙崙小段 1763 地號 2,388 m²（722.3 坪）"
    },
    {
     "title": "現況",
     "body": "航空城徵收，舊廟將拆除；神明暫奉於新廟預定地上的臨時紅壇，待新廟落成遷入"
    }
   ]
  }
 },
 {
  "order": 6,
  "id": "deity",
  "style": "deity",
  "title": "奉祀神明",
  "subtitle": "",
  "body": "尊王大忠大孝、至仁至勇，十八歲即顯武德威赫，以仁政保境安民。歷代敕封「保安廣澤尊王」，道號「九天考輔保安廣澤尊王」，民間敬稱「聖王公」、「郭聖王」。\n\n據廟內〈保安宮沿革誌〉記載，尊王降誕於歲次乙未二月廿二日，飛昇於歲次丙午八月廿二日，得道於漳州鳳山寺。",
  "photos": [
   {
    "src": "img/p29.jpg",
    "thumb": "img/p29.jpg",
    "alt": "保安廣澤尊王",
    "caption": ""
   }
  ],
  "show": true,
  "navTitle": "神明",
  "data": {
   "name": "保安廣澤尊王",
   "items": [
    {
     "label": "誕辰",
     "value": "農曆二月廿二日"
    },
    {
     "label": "飛昇",
     "value": "農曆八月廿二日"
    },
    {
     "label": "宮慶",
     "value": "每年農曆八月廿一日"
    },
    {
     "label": "信仰圈",
     "value": "沙崙、竹圍、海口、後厝、三石、菓林（聖王公會）"
    },
    {
     "label": "陪祀神明",
     "value": "本宮天上聖母、奉天宮天上聖母、朝天宮天上聖母、六興宮天上聖母、天后宮天上聖母、南瑤宮天上聖母、開漳聖王、關聖帝君、中壇元帥、南斗星君、北斗星君、玄天上帝、神農大帝、觀世音菩薩、福德正神"
    }
   ]
  }
 },
 {
  "order": 7,
  "id": "gallery",
  "style": "gallery",
  "title": "廟景",
  "subtitle": "",
  "body": "",
  "photos": [
   {
    "src": "img/p24.jpg",
    "thumb": "img/p24.jpg",
    "alt": "廟貌正面",
    "caption": "廟貌正面"
   },
   {
    "src": "img/p26.jpg",
    "thumb": "img/p26.jpg",
    "alt": "廟埕與兩側樓閣",
    "caption": "廟埕與兩側樓閣"
   },
   {
    "src": "img/p27.jpg",
    "thumb": "img/p27.jpg",
    "alt": "廟埕樓閣",
    "caption": "廟埕樓閣"
   },
   {
    "src": "img/p28.jpg",
    "thumb": "img/p28.jpg",
    "alt": "正殿　廣澤尊王匾",
    "caption": "正殿　廣澤尊王匾"
   },
   {
    "src": "img/p29.jpg",
    "thumb": "img/p29.jpg",
    "alt": "保安廣澤尊王",
    "caption": "保安廣澤尊王"
   },
   {
    "src": "img/p30.jpg",
    "thumb": "img/p30.jpg",
    "alt": "正殿神龕",
    "caption": "正殿神龕"
   },
   {
    "src": "img/p31.jpg",
    "thumb": "img/p31.jpg",
    "alt": "法會供桌",
    "caption": "法會供桌"
   },
   {
    "src": "img/p37.jpg",
    "thumb": "img/p37.jpg",
    "alt": "歡迎牌樓（民國七十七年興建）",
    "caption": "歡迎牌樓（民國七十七年興建）"
   },
   {
    "src": "img/p43.jpg",
    "thumb": "img/p43.jpg",
    "alt": "「金蘭之光」匾",
    "caption": "「金蘭之光」匾"
   },
   {
    "src": "img/p42.jpg",
    "thumb": "img/p42.jpg",
    "alt": "台灣保安廣澤尊王金蘭會第七次聯誼會",
    "caption": "台灣保安廣澤尊王金蘭會第七次聯誼會"
   },
   {
    "src": "img/p44.jpg",
    "thumb": "img/p44.jpg",
    "alt": "法會現場",
    "caption": "法會現場"
   },
   {
    "src": "img/p33.jpg",
    "thumb": "img/p33.jpg",
    "alt": "信眾齊聚",
    "caption": "信眾齊聚"
   }
  ],
  "show": true,
  "navTitle": "廟景",
  "data": {
   "photoSection": "廟景"
  }
 },
 {
  "order": 8,
  "id": "now",
  "style": "gallery",
  "title": "臨時紅壇",
  "subtitle": "新廟興建期間，請至紅壇參拜",
  "body": "舊廟因航空城徵收將拆除，神明現暫奉於新廟預定地上的臨時紅壇（中央路 418 之一號），待新廟蓋好後再遷入新殿。",
  "photos": [
   {
    "src": "img/p06.jpg",
    "thumb": "img/p06.jpg",
    "alt": "臨時紅壇外觀",
    "caption": "臨時紅壇外觀"
   },
   {
    "src": "img/p04.jpg",
    "thumb": "img/p04.jpg",
    "alt": "紅壇入口與香爐",
    "caption": "紅壇入口與香爐"
   },
   {
    "src": "img/p19.jpg",
    "thumb": "img/p19.jpg",
    "alt": "紅壇內暫奉神明",
    "caption": "紅壇內暫奉神明"
   }
  ],
  "show": true,
  "navTitle": "紅壇",
  "data": {}
 },
 {
  "order": 9,
  "id": "steles",
  "style": "stele",
  "title": "石碑全文",
  "subtitle": "依原碑逐字轉錄；□ 為碑面風化、無法辨識之字。點標題展開。",
  "body": "",
  "photos": [],
  "show": true,
  "navTitle": "石碑",
  "data": {
   "entries": [
    {
     "title": "沙崙保安宮沿革",
     "subtitle": "碑面無立碑年月（記至民國六十八年完工）",
     "body": "常思先賢格言 公益眾事 為善最樂 鑑諸本保安宮著蹟有年 古風存焉 懿哉\n先民冒險犯難 渡台開基創業 定居於桃園縣大園鄉沙崙村 村民為求神靈保佑\n合境平安 國泰民安 風調雨順 遂集資建廟恭奉保安尊王 以便日夜膜拜 至\n今有三十餘年 因年久失修 日漸陳舊 而今時代進步 百業繁榮 人口昌盛\n眾善信有鑑於廟地過於狹小 廟宇陳舊 無法修繕擴建 遂另尋地遷建於今之吉\n地 在眾善男信女各方奔走下 於民國六十五年間興建後殿 為求本保安宮規模\n更加宏偉壯麗 宮宇更加光大 蒙得善信踴躍捐獻 共襄盛舉 於民國六十六年\n間前殿得以興工鳩造 由於各方之全力配合 不畏辛勞 於民國六十八年完工\n至此本保安宮煥然一新 美侖美奐 神安民樂 加以地近桃園市 大園鄉竹\n圍漁港 沙崙港 交通發達 風景優美 又中正國際機場完工啟用以來 本保安宮\n更是聞名四海 神威遠播 特此立石永誌 為我保安宮全体信士大德 共同努力\n之成就 功德無量也。\n\n主任委員 許榮源\n副主任委員 陳阿瑞\n會計委員 陳其福\n監事委員 簡連鳳\n監工委員 黃德豐 陳阿瑞\n\n緣首\n許榮源 陳其福 陳阿瑞 陳木樹 簡連鳳\n陳金福 江萬來 楊財旺 黃德豐 黃阿國\n陳　財 莊清通 陳世輝 謝照得 褚福明\n謹識\n\n樂捐芳名（碑面左半褪色嚴重，照片解析度不足，金額與人名多數無法辨識，暫不收錄）",
     "photo": "img/stele_p39.jpg",
     "photoLabel": "石碑原貌（點圖放大）"
    },
    {
     "title": "保安宮沿革誌",
     "subtitle": "碑面無立碑年月",
     "body": "桃園縣大園鄉沙崙村保安宮奉祀保安廣澤尊王為主神 嘗思所崇大忠大\n孝至仁至勇謂之聖 十八年華身顯武德之威赫 保衛國家以仁政德洽之安\n邦 聖德神通廣澤華夏為中天 敕封保安廣澤尊王 道號九天考輔保安廣\n澤尊王 溯道經云北斗轉迴降誕于永壽元年歲次乙未二月廿二日 七十二\n飛昇鳳中于歲次丙午年八月廿二日 史傳云郭聖王登號汾陽於華北黃河上\n城（現汾陽縣）自得道（飛昇）於漳州鳳山寺 承獻帝詔賜祭樂並封廣澤\n尊王 斯聖靈顯耀中原神州聖地皆自在 威赫浩氣塞乾坤 其明斯日月 祀聖\n靈天長地久矣 凡吾中華民族尊聖崇功 思慕群居安寧 由溯昔憑依沙崙、\n竹圍、海口、後厝、三石、菓林等地方崇信保安廣澤尊王 其儀盛者結會\n稱為聖王公會 按期輪值祭祀當中 神人共結善緣 年益深固 亦即神庥降靈\n于感應聖恩浩大 緣起者衆善信異口同音為立廟鎮撫地方 至於民國三十\n六年歲次丁亥端月 經地方士紳陳全福、陳土金等發起募捐經費 承陳萬金\n捐獻基地約三十坪 開始創建廟堂乙殿 敕號曰保安宮 時經地方繁榮從之\n應興應革事項面臨迫切 而之故經衆善信鑒於遠大一策 於民國六十五年\n端月由陳朝和、蔡嵩峯、許榮源、簡連鳳等信士提倡遷址擴建 經信徒大\n會贊同百隨踴躍 即將組織重建委員會 公推\n\n重建委員會（碑面為格狀排列，職稱與人名對應不完全確定，以下依碑面順序列名）\n主任委員 陳朝和\n副主任委員 蔡嵩峯\n委員 許榮源 邱武男 黃德豐 陳金福 簡連鳳 邱萬金 呂欽宗 李德圓 謝阿豹 陳炎發\n　　 張承希 黃　來 游萬枝 陳世輝 林　金 游　福 楊財旺 藍再添 林　來 劉福來\n　　 汪萬來 陳吳□ 陳水塗 林清松 黃阿國 許阿佳 陳木來 謝阿福 陳阿瑞 陳世章\n　　 陳德棟 康路金\n總務 林器聰\n常務監事 蘇傳塗\n監事 陳文華 陳木樹 林文香\n監工 李金藤 陳　才\n會計 陳其福\n出納 徐正結",
     "photo": "img/stele_p40.jpg",
     "photoLabel": "石碑原貌（點圖放大）"
    },
    {
     "title": "沙崙保安宮整建工程誌",
     "subtitle": "中華民國九十三年四月",
     "body": "緣起：\n保安廣澤尊王 威靈顯赫 神恩廣被 眾信四方 香火鼎盛 民國六十五年歲次\n丙辰 遷址擴建 廟廓宏具 民國七十七年歲次戊辰 配合慶成建醮 興建歡迎牌樓、\n增購廟地修葺過水庭 增建鐘鼓樓及鄉公所編列興建社區活動中心 充實文康設施等 並\n蒙中油公司贊助完成老人活動中心 使環境廟貌更趨齊整 民國八十一年歲次壬申十\n一月吉旦 座向大利 舉辦圓醮大典 萬眾虔誠叩謝神恩慈悲普渡 肇啓宏基丕奠\n續有擴展增進 興建金亭等 誠為神光普照 眾志成城所激越增輝。\n民國九十一 本宮管理委員會鑑於建廟已屆二十餘年 剪黏脊頂退色破漏 泥作塑\n雕侵蝕老舊 壁堵、神龕相形簡陋 天井、地板亦待整修 廟前戲台影響地理環境\n乃經陳清萬等委員提案拆除整修 經討論獲管理委員會一致決議通過 監事會全力支\n持 授權主任委員、副主任委員、常務委員、常務監事等運用圓醮暨拜斗會歷年結餘\n款項 併信眾油香捐獻 作為整建經費 逐步執行。\n全體委員、監事、緣首、工作人員、爐下眾信徒善男信女歷經群策群力 終不負神\n恩 同心協力完成今日堂皇富麗之「保安宮」也。\n\n施工項目 概括為八大項目：\n（一）前、後殿屋頂剪黏翻新。\n（二）廟內前、後殿全部裝飾木雕。\n（三）廟內壁堵紅寶石鑲嵌。\n（四）廟內地板紅寶石鋪設。\n（五）首份、光明、太歲燈。\n（六）日月井、電氣換裝及殿前拜桌。\n（七）廟前戲臺拆除。\n（八）廟前沿革牆等。\n前列八項整建工程總經費共新台幣壹仟伍佰貳拾餘萬元正。\n\n桃園縣大園鄉沙崙保安宮管理委員會\n主任委員：陳朝和\n副主任委員：陳連壽\n常務委員：陳清萬 陳阿勇 游武結\n委員：蔡興隆 吳翠屏 陳福來 陳枝萬 林阿文 莊阿塗 諸福明 簡隆吉 陳春成 游進富\n　　　徐金連 陳西源 郭明輝 陳福傳 游水源\n常務監事：陳宗賢\n監事：蔡春義 簡國強 陳世章 陳元忠\n候補委員：魏天德\n會計：徐正結\n廟幹事：黃坪福 陳聖德\n廟祝：陳蕃薯\n敬撰：蘇傳登\n全謹識\n中華民國九十三年四月吉旦",
     "photo": "img/stele_p25.jpg",
     "photoLabel": "石碑原貌（點圖放大）"
    },
    {
     "title": "沙崙保安宮購地源由",
     "subtitle": "中華民國九十八年十二月一日",
     "body": "沙崙保安宮管理委員會由主任委員陳朝和先生於九十六年七月初召開購地會議，全體委員、監事一致通過向桃園地方法院標購沙崙段沙崙小段一七六三地號面積二三八八M²（七二二、三坪）當年七月廿一日押標金新台幣捌拾陸萬陸仟元正，尾款當年八月九日繳款新台幣陸佰壹拾壹萬肆仟元正，總計新台幣陸佰玖拾捌萬元整，經委員會開會通過讓善信大德自由認捐現將購買土地自由捐獻善信大德芳名及金額、住址詳列於后。\n\n沙崙保安宮管理委員會\n主任委員：陳連壽\n副主任委員：游武結\n常務監事：蔡建弘\n敬撰人：黃坪福\n暨全體委員監事謹誌\n\n貳萬元\n陳耀輝　樹林市\n陳阿房　沙崙村\n\n壹萬元\n吳江水　〃\n許秀英　〃\n黃世昌　〃\n黃金龍　〃\n黃阿德　〃\n陳建中　〃\n游順亨　〃\n游進國　〃\n陳蘇種花　〃\n徐郭美玉　大園村\n林文彬　橫峰村\n游景忠　田心村\n\n壹萬元\n郭好風　田心村\n陳昭明　后厝村\n郭燕芳　〃\n陳俊傑　〃\n陳瑞祁　樹林市\n陳俊祺　〃\n陳皓文　〃\n蔡金□　林口鄉\n\n伍仟元\n郭震輝　內海村\n游□阿心　沙崙村\n林阿生　〃\n東崑樂　〃\n陳泳旭　〃\n楊寶蓮　〃\n\n伍仟元\n陳北保　沙崙村\n陳清祈　大園村\n郭洪素娥　后厝村\n范揚烽　三重市\n\n參仟元\n張文吉　大園村\n周榮昌　蘆竹鄉\n\n中華民國九十八年十二月一日",
     "photo": "img/stele_p22.jpg",
     "photoLabel": "石碑原貌（點圖放大）"
    }
   ]
  }
 },
 {
  "order": 10,
  "id": "visit",
  "style": "address",
  "title": "參拜資訊",
  "subtitle": "",
  "body": "",
  "photos": [],
  "show": true,
  "navTitle": "參拜",
  "data": {
   "mapLabel": "中央路 418 之一號（臨時紅壇）",
   "mapQuery": "桃園市大園區中央路418之1號",
   "address": "桃園市大園區沙崙里中央路 418 之一號（臨時紅壇）",
   "chair": "駱文章",
   "phone": "03-383-6940",
   "hours": "每日 06:00 – 19:00",
   "lamp": "光明燈、太歲燈",
   "lampNote": "登記方式待提供"
  }
 },
 {
  "order": 11,
  "id": "footer",
  "style": "footer",
  "title": "沙崙保安宮",
  "subtitle": "",
  "body": "",
  "photos": [],
  "show": true,
  "navTitle": "",
  "data": {
   "chair": "駱文章",
   "address": "桃園市大園區沙崙里中央路 418 之一號",
   "phone": "03-383-6940",
   "note": "網站初版；標示「待廟方提供」處於資料到齊後補上。"
  }
 }
];
var CSS = "\n  :root{\n    color-scheme:light;\n    --bg:#FFFFFF; --bg-2:#FBF7F0; --ink:#1A1714; --ink-2:#3D3732; --muted:#857B70;\n    --red:#A8231A; --red-deep:#7A150F; --gold:#B38A3E; --gold-soft:#E8D9B5;\n    --line:#E7DFD2; --pend:#2E6A5D;\n  }\n  *{box-sizing:border-box}\n  html{scroll-behavior:smooth}\n  body{margin:0;background:var(--bg);color:var(--ink);font-family:\"Noto Sans TC\",-apple-system,\"PingFang TC\",\"Microsoft JhengHei\",sans-serif;font-size:17px;line-height:1.85}\n  img{max-width:100%;display:block}\n  a{color:inherit}\n  .wrap{max-width:1080px;margin:0 auto;padding:0 20px}\n  h1,h2,h3{font-family:\"Noto Serif TC\",\"Songti TC\",\"PMingLiU\",serif;text-wrap:balance;margin:0}\n\n  /* 頂部：朱紅細條＋白底導覽 */\n  .top{position:sticky;top:0;z-index:5;background:rgba(255,255,255,.96);backdrop-filter:blur(6px);border-top:4px solid var(--red);box-shadow:0 1px 0 var(--gold-soft)}\n  .top .wrap{display:flex;align-items:center;justify-content:space-between;gap:16px;height:60px}\n  .brand{display:flex;align-items:center;gap:12px;font-family:\"Noto Serif TC\",serif;font-weight:900;font-size:21px;letter-spacing:.12em;text-decoration:none;color:var(--red-deep)}\n  .seal{width:36px;height:36px;border-radius:3px;background:var(--red);color:#FFF4DC;display:grid;place-items:center;font-size:17px;font-weight:900;box-shadow:inset 0 0 0 2px #FFF4DC,inset 0 0 0 3px var(--red)}\n  nav{display:flex;gap:24px;font-size:15.5px;font-weight:500;letter-spacing:.06em}\n  nav a{text-decoration:none;color:var(--ink-2);padding:4px 0;border-bottom:2px solid transparent}\n  nav a:hover,nav a:focus-visible{color:var(--red);border-bottom-color:var(--red);outline:none}\n  nav,.hist>*,.deity>*,.visit>*,.facts>*{min-width:0}\n  @media (max-width:760px){nav{gap:14px;font-size:14px;overflow-x:auto}.brand span.name{display:none}}\n\n  /* 主視覺：照片＋底部漸層，標題白字 */\n  .hero{position:relative;height:min(66vh,580px);min-height:360px;display:flex;align-items:flex-end;background:#3a2a20}\n  .hero img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}\n  .hero::after{content:\"\";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0) 40%,rgba(40,12,8,.62) 100%)}\n  .hero .t{position:relative;z-index:1;width:100%;max-width:1080px;margin:0 auto;padding:0 20px 76px;color:#fff}\n  .plaque-h{font-family:\"Noto Serif TC\",serif;font-weight:900;font-size:clamp(42px,7vw,72px);letter-spacing:.2em;line-height:1.1;color:#fff;text-shadow:0 3px 18px rgba(0,0,0,.45)}\n  .hero .sub{margin-top:12px;font-size:16.5px;letter-spacing:.12em;color:#fff;text-shadow:0 1px 8px rgba(0,0,0,.5)}\n\n  /* 重點資訊卡：浮在主視覺下緣 */\n  .facts{position:relative;z-index:2;margin-top:-48px;display:grid;grid-template-columns:repeat(4,1fr);background:#fff;border-top:4px solid var(--red);box-shadow:0 10px 30px rgba(60,30,10,.12)}\n  .fact{padding:18px 22px;border-right:1px solid var(--line);text-align:center}\n  .fact:last-child{border-right:0}\n  .fact b{display:block;font-size:12.5px;letter-spacing:.2em;color:var(--gold);font-weight:700;margin-bottom:4px}\n  .fact span{font-family:\"Noto Serif TC\",serif;font-size:18px;font-weight:700;color:var(--ink)}\n  @media (max-width:760px){.facts{grid-template-columns:1fr 1fr;margin-top:-36px}.fact{border-bottom:1px solid var(--line)}.fact:nth-child(2n){border-right:0}}\n\n  .pending{color:var(--pend);font-size:13px;border:1px solid var(--pend);padding:0 7px;border-radius:2px;letter-spacing:.04em;white-space:nowrap;font-family:\"Noto Sans TC\",sans-serif;font-weight:500}\n\n  /* 區塊：白／米白交替，標題置中＋金線紅菱 */\n  section{padding:72px 0}\n  section:nth-of-type(even){background:var(--bg-2)}\n  .sec-head{text-align:center;margin-bottom:40px}\n  .sec-head h2{display:inline-flex;align-items:center;gap:18px;font-size:30px;font-weight:900;letter-spacing:.3em;color:var(--red-deep);padding-left:.3em}\n  .sec-head h2::before,.sec-head h2::after{content:\"\";width:56px;height:1px;background:linear-gradient(90deg,transparent,var(--gold));}\n  .sec-head h2::after{transform:scaleX(-1)}\n  .sec-head p{margin:10px 0 0;color:var(--muted);font-size:15px;letter-spacing:.06em}\n  .sec-head p::before{content:\"◆\";display:block;color:var(--red);font-size:10px;margin-bottom:8px}\n  .sec-head p:empty{display:none}\n\n  .hist{display:grid;grid-template-columns:1.05fr .95fr;gap:52px;align-items:start}\n  .hist p{margin:0 0 16px;color:var(--ink-2);text-align:justify}\n  .hist p:first-child::first-letter{float:left;font-family:\"Noto Serif TC\",serif;font-size:52px;line-height:1;font-weight:900;color:var(--red);margin:6px 10px 0 0}\n  .timeline{list-style:none;margin:0;padding:6px 0 0;border-left:2px solid var(--gold-soft)}\n  .timeline li{position:relative;padding:0 0 22px 26px}\n  .timeline li::before{content:\"\";position:absolute;left:-7px;top:10px;width:12px;height:12px;background:var(--red);transform:rotate(45deg)}\n  .timeline b{display:block;font-family:\"Noto Serif TC\",serif;font-size:18px;color:var(--red-deep)}\n  .timeline span{color:var(--ink-2);font-size:15.5px}\n  @media (max-width:820px){.hist{grid-template-columns:1fr;gap:32px}}\n\n  .deity{display:grid;grid-template-columns:340px 1fr;gap:48px;align-items:center}\n  .deity img{aspect-ratio:4/5;object-fit:cover;width:100%;padding:8px;background:#fff;border:1px solid var(--gold);box-shadow:0 0 0 6px #fff,0 0 0 7px var(--gold-soft),0 14px 30px rgba(60,30,10,.14)}\n  .deity h3{font-size:28px;font-weight:900;color:var(--red-deep);letter-spacing:.12em;margin-bottom:14px}\n  .deity p{margin:0 0 14px;color:var(--ink-2);text-align:justify}\n  .kv{display:grid;grid-template-columns:auto 1fr;margin:20px 0 0;font-size:15.5px;border-top:1px solid var(--line)}\n  .kv dt,.kv dd{padding:9px 0;border-bottom:1px solid var(--line)}\n  .kv dt{color:var(--gold);font-weight:700;letter-spacing:.12em;padding-right:22px}\n  .kv dd{margin:0;font-weight:500}\n  @media (max-width:760px){.deity{grid-template-columns:1fr;gap:28px}.deity img{max-width:320px;margin:0 auto}}\n\n  .gallery{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}\n  .gallery figure{margin:0;background:#fff;border:1px solid var(--line);overflow:hidden}\n  .gallery img{width:100%;aspect-ratio:4/3;object-fit:cover;transition:transform .4s ease}\n  .gallery figure:hover img{transform:scale(1.03)}\n  .gallery figcaption{padding:10px 14px;font-size:14.5px;color:var(--ink-2);border-top:2px solid var(--red)}\n  @media (max-width:820px){.gallery{grid-template-columns:1fr 1fr;gap:12px}}\n  @media (max-width:480px){.gallery{grid-template-columns:1fr}}\n  .note{max-width:44em;margin:0 auto 28px;text-align:center;color:var(--ink-2)}\n\n  .stele{background:#fff;border:1px solid var(--line);border-left:4px solid var(--red);margin:0 auto 12px;max-width:860px}\n  .stele summary{cursor:pointer;padding:18px 22px;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:baseline;list-style:none}\n  .stele summary::-webkit-details-marker{display:none}\n  .stele summary::before{content:\"＋\";color:var(--red);font-weight:900;margin-right:4px}\n  .stele[open] summary::before{content:\"－\"}\n  .stele[open] summary{border-bottom:1px dashed var(--gold-soft)}\n  .st-t{font-family:\"Noto Serif TC\",serif;font-weight:900;font-size:19px;flex:1;color:var(--ink)}\n  .st-w{font-size:13px;color:var(--muted)}\n  @media (max-width:600px){.st-t{flex-basis:calc(100% - 2em)}.st-w{padding-left:1.6em}}\n  .stele .st-photo{display:block;padding:16px 22px 0;text-align:center}\n  .stele .st-photo img{max-width:100%;max-height:560px;border:1px solid var(--line)}\n  .stele .st-photo span{display:block;font-size:13px;color:var(--muted);margin-top:4px}\n  .stele pre{margin:0;padding:18px 26px 26px;white-space:pre-wrap;word-break:break-all;font-family:\"Noto Serif TC\",serif;font-size:16.5px;line-height:2.1;color:var(--ink)}\n\n  .visit{display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:center}\n  .visit ul{margin:0;padding:0;list-style:none}\n  .visit li{padding:12px 0;border-bottom:1px solid var(--line)}\n  .visit li b{color:var(--gold);letter-spacing:.12em;margin-right:8px}\n  .visit a[href^=\"tel\"]{color:var(--red);font-weight:700;text-decoration:none}\n  .map{width:100%;display:grid;place-items:center;text-align:center;padding:28px}\n  .maplink{text-decoration:none;color:#fff;background:var(--red);border:1px solid var(--red-deep);box-shadow:inset 0 0 0 4px var(--red),inset 0 0 0 5px #E9C77A;font-size:16px;line-height:1.8;min-height:170px}\n  .maplink b{color:#fff;font-family:\"Noto Serif TC\",serif;font-size:22px;letter-spacing:.1em}\n  .maplink:hover,.maplink:focus-visible{background:var(--red-deep);outline:none}\n  @media (max-width:760px){.visit{grid-template-columns:1fr}}\n\n  /* 建新廟專區：置頂、金框大卡 */\n  #newtemple{background:linear-gradient(180deg,#FFF9EF,#FFFFFF);padding-top:64px}\n  .nt{display:grid;grid-template-columns:1.1fr .9fr;gap:40px;align-items:stretch}\n  .nt-img{position:relative;min-height:320px;background:var(--bg-2);border:1px solid var(--gold);box-shadow:0 0 0 6px #fff,0 0 0 7px var(--gold-soft);display:grid;place-items:center;text-align:center;color:var(--muted);font-size:15px}\n  .nt-img img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}\n  .nt-img img.nt-static{bottom:36px;height:calc(100% - 36px);object-position:50% 100%}\n  @media (max-width:820px){.nt-img:has(img.nt-static){min-height:0;aspect-ratio:911/600}}\n  .nt-img .cap{position:absolute;left:0;right:0;bottom:0;padding:8px 14px;background:rgba(122,21,15,.82);color:#FFF4DC;font-size:14px;letter-spacing:.08em}\n  .nt-txt p{margin:0 0 14px;color:var(--ink-2);text-align:justify}\n  .donate{margin-top:18px;background:#fff;border:1px solid var(--line);border-top:4px solid var(--red);padding:18px 22px}\n  .donate h3{font-size:21px;font-weight:900;color:var(--red-deep);letter-spacing:.14em;margin-bottom:6px}\n  .donate .kv{margin-top:8px}\n  .donate .acct{font-family:\"Noto Serif TC\",serif;font-size:19px;font-weight:700;letter-spacing:.06em}\n  @media (max-width:820px){.nt{grid-template-columns:1fr;gap:28px}.nt-img{min-height:220px}}\n\n  .news-list{max-width:860px;margin:0 auto 28px}\n  .news-item{background:#fff;border:1px solid var(--line);border-left:4px solid var(--red);padding:16px 22px;margin-bottom:12px}\n  .news-item time{font-size:13px;color:var(--gold);font-weight:700;letter-spacing:.1em}\n  .news-item h3{font-size:19px;color:var(--ink);margin:2px 0 6px}\n  .news-item p{margin:0;color:var(--ink-2);white-space:pre-line}\n  /* 最新消息：列表只顯示日期＋標題，點開看內容與照片（MAX 2026-10-08 代客料理區） */\n  button.news-item{display:flex;align-items:center;gap:14px;width:100%;text-align:left;font:inherit;cursor:pointer}\n  button.news-item:hover{background:#FBF7F0}\n  button.news-item .t{flex:1;min-width:0}\n  button.news-item h3{margin:2px 0 0}\n  button.news-item .pin{display:inline-block;background:var(--red);color:#fff;font-size:12px;letter-spacing:.1em;padding:0 7px;margin-right:8px;border-radius:2px}\n  button.news-item .go{color:var(--red);font-size:14px;white-space:nowrap}\n  #news-dlg{border:0;padding:0;max-width:760px;width:calc(100% - 24px);max-height:calc(100% - 24px);background:#fff;color:var(--ink)}\n  #news-dlg::backdrop{background:rgba(20,15,10,.6)}\n  #news-dlg .hd{position:sticky;top:0;background:#fff;border-bottom:2px solid var(--red);padding:14px 52px 12px 20px}\n  #news-dlg .hd time{font-size:13px;color:var(--gold);font-weight:700;letter-spacing:.1em}\n  #news-dlg .hd h3{margin:2px 0 0;font-size:20px}\n  #news-dlg .x{position:absolute;z-index:2;top:10px;right:10px;width:36px;height:36px;border:0;background:none;font-size:26px;line-height:1;color:var(--ink-2);cursor:pointer}\n  #news-dlg .bd{padding:16px 20px 22px}\n  #news-dlg .bd p{white-space:pre-line;margin:0 0 14px;color:var(--ink-2)}\n  #news-dlg .ph{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}\n  #news-dlg .ph img{width:100%;aspect-ratio:1;object-fit:cover;display:block}\n  @media (max-width:480px){#news-dlg .ph{grid-template-columns:1fr 1fr}}\n  .nt-progress{margin:0 0 14px;padding:10px 14px;background:#fff;border:1px dashed var(--gold);color:var(--ink-2);white-space:pre-line}\n  .more{text-align:center;margin:18px 0 0}\n  .more button{font:inherit;font-size:15px;padding:8px 22px;border:1px solid var(--red);background:#fff;color:var(--red);cursor:pointer}\n  .gallery a{display:block}\n  .gallery figure.extra{display:none}.gallery.all figure.extra{display:block}\n\n  /* 頁尾：朱紅底白字 */\n  footer{background:var(--red-deep);color:#F8EBD3;padding:36px 0 44px;font-size:14.5px;border-top:4px solid var(--gold)}\n  footer .wrap{display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px}\n  footer .fn{font-family:\"Noto Serif TC\",serif;font-size:20px;font-weight:900;letter-spacing:.2em;color:#fff;display:block;margin-bottom:4px}\n\n.top nav{overflow-x:auto;max-width:100%}.top .wrap{min-width:0}.top nav a{white-space:nowrap}.block-text p{white-space:pre-line}.block-text{max-width:860px;margin:auto}\n";
var library = [
 {style:'text',title:'文字段落',description:'公告、介紹與祈福文字，可搭配照片。',thumbnail:'☷'},
 {style:'gallery',title:'照片牆',description:'多張照片與說明，點圖可放大。',thumbnail:'▦'},
 {style:'address',title:'地址地圖',description:'地址、電話、時間與 Google 地圖導航。',thumbnail:'⌖'},
 {style:'donation',title:'捐款資訊',description:'銀行、戶名、帳號與護持方式。',thumbnail:'♡'},
 {style:'news',title:'最新消息',description:'顯示消息分頁的公告、置頂與活動照片。',thumbnail:'▤'},
 {style:'stele',title:'碑文',description:'保留可展開的全文與石碑照片。',thumbnail:'▥'},
 {style:'newtemple',title:'建新廟',description:'新廟照片、進度及捐款資料。',thumbnail:'⌂'},
 {style:'history',title:'沿革',description:'廟史文字與大事年表。',thumbnail:'⋮'},
 {style:'deity',title:'奉祀神明',description:'神明照片、介紹及誕辰資料。',thumbnail:'❖'},
 {style:'hero',title:'主視覺',description:'大幅照片與網站標題。',thumbnail:'▣'},
 {style:'facts',title:'重點資訊',description:'並列呈現主神、創建與宮慶等資訊。',thumbnail:'▥'},
 {style:'footer',title:'頁尾',description:'廟名、聯絡資訊與網站備註。',thumbnail:'▬'}
];
function clone(x){return JSON.parse(JSON.stringify(x));}
function esc(x){return String(x == null ? '' : x).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function url(x){var s=String(x||'').trim();return /^(https?:\/\/|img\/|\.\.?\/)/i.test(s) ? s : '';}
function photo(p){if(typeof p==='string')p={src:p};p=p||{};var id=p.id||'';return {id:id,src:url(p.src)||(id?'https://drive.google.com/thumbnail?id='+encodeURIComponent(id)+'&sz=w1600':''),thumb:url(p.thumb)||url(p.src)||(id?'https://drive.google.com/thumbnail?id='+encodeURIComponent(id)+'&sz=w480':''),caption:p.caption||'',alt:p.alt||p.caption||''};}
function normalizePhotos(ps){return (Array.isArray(ps)?ps:[]).filter(function(p){return p && p.show!==false && p.show!=='否';}).map(photo).filter(function(p){return p.src;});}
function shown(b){return b && b.show!==false && b.show!=='否';}
function paragraphs(s){return String(s||'').split(/\n\s*\n/).filter(Boolean).map(function(p){return '<p>'+esc(p).replace(/\n/g,'<br>')+'</p>';}).join('');}
function kv(items){return '<dl class="kv">'+(items||[]).map(function(i){return '<dt>'+esc(i.label)+'</dt><dd>'+esc(i.value)+'</dd>';}).join('')+'</dl>';}
function pending(v){return v?esc(v):'<span class="pending">待廟方提供</span>';}
function tel(v){return '<a href="tel:'+esc(String(v||'').replace(/[^0-9+]/g,''))+'">'+esc(v)+'</a>';}
function donation(d){return '<div class="donate"><h3>'+esc(d.donationTitle||'護持捐款')+'</h3><dl class="kv"><dt>銀行</dt><dd>'+pending(d.bank)+'</dd><dt>戶名</dt><dd>'+pending(d.accountName)+'</dd><dt>帳號</dt><dd class="acct">'+pending(d.account)+'</dd><dt>現場</dt><dd>'+esc(d.note)+'</dd><dt>洽詢</dt><dd>'+tel(d.phone)+'</dd></dl></div>';}
function gallery(ps,id){if(!ps.length)return '';return '<div class="gallery" id="'+id+'">'+ps.map(function(p,i){return '<figure'+(i>=12?' class="extra"':'')+'><a href="'+esc(p.src)+'" target="_blank" rel="noopener"><img src="'+esc(p.thumb||p.src)+'" alt="'+esc(p.alt||p.caption)+'" loading="lazy"></a>'+(p.caption?'<figcaption>'+esc(p.caption)+'</figcaption>':'')+'</figure>';}).join('')+'</div>'+(ps.length>12?'<p class="more"><button type="button" data-more="'+id+'">看更多照片</button></p>':'');}
function applySettings(blocks,oldSettings,newSettings){
 oldSettings=oldSettings||{};newSettings=newSettings||{};
 var keys={nt_intro:'body',nt_progress:'progress',nt_bank:'bank',nt_name:'accountName',nt_account:'account',nt_note:'note',phone:'phone',address:'address',chair:'chair',hours:'hours',lamp:'lamp'};
 Object.keys(keys).forEach(function(k){if(!(k in newSettings)||String(oldSettings[k]||'')===String(newSettings[k]||''))return;
  (blocks||[]).forEach(function(b){var d=b.data||(b.data={}),v=String(newSettings[k]||'');
   if(k.indexOf('nt_')===0&&(b.style==='newtemple'||b.style==='donation')){if(k==='nt_intro')b.body=v;else d[keys[k]]=v;}
   if(k.indexOf('nt_')!==0&&(b.style==='address'||(b.style==='footer'&&['address','chair','phone'].indexOf(k)>=0)||(k==='phone'&&(b.style==='donation'||b.style==='newtemple')))){
    d[keys[k]]=v;if(k==='address'&&b.style==='address'){d.mapLabel=v;d.mapQuery=v;}
   }
  });
 });return blocks;
}
function migrate(c){
 c=c||{};if(Array.isArray(c.blocks))return clone(c.blocks);
 var blocks=clone(DEFAULTS),settings=c.settings||{};
 // Nonempty legacy overrides were what the former public page displayed.
 var nonempty={};Object.keys(settings).forEach(function(k){if(settings[k])nonempty[k]=settings[k];});
 // Preserve legacy map/footer wording until an address is edited after migration.
 var address=nonempty.address;delete nonempty.address;delete nonempty.chair;delete nonempty.phone;
 applySettings(blocks,{},nonempty);
 blocks.forEach(function(b){var d=b.data;
  if(b.style==='address'){['address','phone','chair','hours','lamp'].forEach(function(k){if(settings[k])d[k]=settings[k];});}
  if(b.style==='newtemple'&&settings.phone)d.phone=settings.phone;
  if(b.style==='news')b.show=(c.news||[]).some(shown)||normalizePhotos((c.photos||{})['活動']).length>0;
 });
 // Legacy section parity includes the former hidden news section.
 ['history','gallery','steles'].forEach(function(id){blocks.find(function(b){return b.id===id;}).data.background='#FFFFFF';});
 ['deity','now','visit'].forEach(function(id){blocks.find(function(b){return b.id===id;}).data.background='#FBF7F0';});
 return blocks;
}
function fromAdmin(d){
 d=d||{};var c=clone(d.content||{}),s={};
 if(Array.isArray(d.settings))d.settings.forEach(function(r){s[r.key]=r.value;});else s=d.settings||c.settings||{};
 c.blocks=clone(Array.isArray(d.blocks)?d.blocks:(c.blocks||migrate(c)));
 applySettings(c.blocks,c.settings||{},s);c.settings=s;
 c.news=(d.news||c.news||[]).filter(shown).map(function(n){var a=clone(n);a.photos=normalizePhotos(n.photos);return a;});
 if(Array.isArray(d.photos)){c.photos={};d.photos.filter(shown).sort(function(a,b){return Number(a.order||0)-Number(b.order||0);}).forEach(function(p){(c.photos[p.section]||(c.photos[p.section]=[])).push(photo(p));});}
 c.photos=c.photos||{};return c;
}
function createBlock(style){
 if(!library.some(function(t){return t.style===style;}))throw new Error('不支援的積木樣式');
 var sample=DEFAULTS.find(function(b){return b.style===style;}),b=sample?clone(sample):{style:style,data:{},photos:[]};
 b.id='block-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);b.order=999;b.title=library.find(function(t){return t.style===style;}).title;b.subtitle='';b.body='';b.photos=[];b.show=true;b.navTitle=b.title;
 if(style==='text')b.data={};
 if(style==='gallery')b.data={};
 if(style==='news')b.data={photoSection:'活動'};
 if(style==='stele')b.data={entries:[{title:'碑文標題',subtitle:'',body:'',photo:'',photoLabel:'石碑原貌（點圖放大）'}]};
 if(style==='donation')b.data={donationTitle:'護持捐款',bank:'',accountName:'',account:'',note:'',phone:''};
 if(style==='hero'||style==='facts'||style==='footer')b.navTitle='';
 return b;
}
function render(c){
 c=c||{};var raw=Array.isArray(c.blocks)?c.blocks:migrate(c),ids={'news-dlg':true},news=(c.news||[]).filter(shown).slice().sort(function(a,b){return (Number(!!b.pin)-Number(!!a.pin))||String(b.date).localeCompare(String(a.date));});
 var blocks=raw.map(function(b,i){return {b:b,i:i};}).filter(function(x){return shown(x.b);}).sort(function(a,b){return (Number(a.b.order||0)-Number(b.b.order||0))||a.i-b.i;}).map(function(x){var b=clone(x.b),id=String(b.id||'block-'+x.i).replace(/[^a-zA-Z0-9_-]/g,'-')||'block-'+x.i,base=id,n=1;while(ids[id])id=base+'-'+(++n);ids[id]=true;b.id=id;return b;});
 var nav=blocks.filter(function(b){return b.navTitle!=='' && (b.navTitle||b.title);}).map(function(b){return '<a href="#'+esc(b.id)+'" data-nav="'+esc(b.id)+'">'+esc(b.navTitle||b.title)+'</a>';}).join('');
 var html='<header class="top"><div class="wrap"><a class="brand" href="#"><span class="seal">保</span><span class="name">沙崙保安宮</span></a><nav aria-label="頁面導覽">'+nav+'</nav></div></header>';
 blocks.forEach(function(b,blockIndex){var d=b.data||{},id=esc(b.id),ps=normalizePhotos(b.photos),galleryId='g-'+b.id,linked=normalizePhotos(((c.photos||{})[d.photoSection]||[]).slice().sort(function(a,b){return Number(a.order||0)-Number(b.order||0);})),inner='';
  while(ids[galleryId])galleryId+='-gallery';ids[galleryId]=true;
  if(b.style==='hero'){var p=ps[0];html+='<div class="hero" id="'+id+'">'+(p?'<img src="'+esc(p.src)+'" alt="'+esc(p.alt)+'">':'')+'<div class="t"><div class="plaque-h">'+esc(b.title)+'</div><div class="sub">'+esc(b.subtitle)+'</div>'+paragraphs(b.body)+'</div></div>'+(ps.length>1?'<div class="wrap">'+gallery(ps.slice(1),galleryId)+'</div>':'');return;}
  if(b.style==='facts'){html+='<div class="wrap" id="'+id+'">'+(b.title||b.subtitle?'<div class="sec-head"><h2>'+esc(b.title)+'</h2><p>'+esc(b.subtitle)+'</p></div>':'')+paragraphs(b.body)+'<div class="facts"'+(blockIndex>0&&blocks[blockIndex-1].style==='hero'&&!b.title&&!b.subtitle&&!b.body?'':' style="margin-top:0"')+'>'+(d.items||[]).map(function(i){return '<div class="fact"><b>'+esc(i.label)+'</b><span>'+esc(i.value)+'</span></div>';}).join('')+'</div>'+gallery(ps,galleryId)+'</div>';return;}
  if(b.style==='footer'){html+='<footer id="'+id+'"><div class="wrap"><div><span class="fn">'+esc(b.title)+'</span>管理委員會（主任委員 '+esc(d.chair)+'） · '+esc(d.address)+' · '+esc(d.phone)+(b.body?'<p>'+esc(b.body)+'</p>':'')+'</div><div>'+esc(d.note)+(b.subtitle?'<p>'+esc(b.subtitle)+'</p>':'')+'</div>'+gallery(ps,galleryId)+'</div></footer>';return;}
  switch(b.style){
   case 'newtemple':
    var p=linked[0]||ps[0];inner='<div class="nt"><div class="nt-img">'+(p?'<img'+(!linked.length?' class="nt-static"':'')+' src="'+esc(p.src)+'" alt="'+esc(p.alt||p.caption)+'">':'')+'<div class="cap">'+esc(p&&(p.caption||p.alt))+'</div></div><div class="nt-txt">'+paragraphs(b.body)+(d.progress?'<p class="nt-progress"><b>目前進度：</b>'+esc(d.progress)+'</p>':'')+donation(d)+'</div></div>'+gallery(ps.slice(1),galleryId);break;
   case 'history':inner='<div class="hist"><div>'+paragraphs(b.body)+'</div><ol class="timeline">'+(d.timeline||[]).map(function(t){return '<li><b>'+esc(t.title)+'</b><span>'+esc(t.body)+'</span></li>';}).join('')+'</ol></div>'+gallery(ps,galleryId);break;
   case 'deity':var p=ps[0];inner='<div class="deity">'+(p?'<img src="'+esc(p.src)+'" alt="'+esc(p.alt||p.caption)+'" loading="lazy">':'')+'<div><h3>'+esc(d.name)+'</h3>'+paragraphs(b.body)+kv(d.items)+'</div></div>'+gallery(ps.slice(1),galleryId);break;
   case 'gallery':inner=(b.body?'<p class="note">'+esc(b.body).replace(/\n/g,'<br>')+'</p>':'')+gallery(ps.concat(linked),galleryId);break;
   case 'address':inner='<div class="visit"><a class="map maplink" href="https://www.google.com/maps/search/?api=1&amp;query='+encodeURIComponent(d.mapQuery||d.address||'')+'" target="_blank" rel="noopener"><span><b>📍 用 Google 地圖導航</b><br>'+esc(d.mapLabel||d.address)+'</span></a><div><ul><li><b>地址</b>：<span>'+esc(d.address)+'</span></li><li><b>管理委員會</b>：主任委員 <span>'+esc(d.chair)+'</span></li><li><b>電話</b>：'+tel(d.phone)+'</li><li><b>開放時間</b>：<span>'+esc(d.hours)+'</span></li><li><b>點燈服務</b>：<span>'+esc(d.lamp)+'</span> '+(d.lampNote?'<span class="pending">'+esc(d.lampNote)+'</span>':'')+'</li></ul>'+paragraphs(b.body)+'</div></div>'+gallery(ps,galleryId);break;
   case 'donation':inner=paragraphs(b.body)+donation(d)+gallery(ps,galleryId);break;
   case 'news':inner=paragraphs(b.body)+'<div class="news-list">'+news.map(function(n,i){var k=normalizePhotos(n.photos).length;return '<button type="button" class="news-item" data-news="'+i+'"><span class="t"><time>'+(n.pin?'<span class="pin">置頂</span>':'')+esc(n.date)+'</time><h3>'+esc(n.title)+'</h3></span><span class="go">'+(k?'📷 '+k+' 張 ':'')+'看內容 ›</span></button>';}).join('')+'</div>'+gallery(ps.concat(linked),galleryId);break;
   case 'stele':inner=paragraphs(b.body)+(d.entries||[]).map(function(e){var p=url(e.photo);return '<details class="stele"><summary><span class="st-t">'+esc(e.title)+'</span><span class="st-w">'+esc(e.subtitle)+'</span></summary>'+(p?'<a class="st-photo" href="'+esc(p)+'" target="_blank" rel="noopener"><img src="'+esc(p)+'" alt="'+esc(e.title)+'石碑照片" loading="lazy"><span>'+esc(e.photoLabel)+'</span></a>':'')+'<pre>'+esc(e.body)+'</pre></details>';}).join('')+gallery(ps,galleryId);break;
   default:inner='<div class="block-text">'+paragraphs(b.body)+'</div>'+gallery(ps,galleryId);
  }
  html+='<section id="'+id+'" class="block-'+esc(b.style)+'"'+(/^#[a-f0-9]{6}$/i.test(d.background||'')?' style="background:'+esc(d.background)+'"':'')+'><div class="wrap"><div class="sec-head"><h2>'+esc(b.title)+'</h2>'+(b.subtitle?'<p>'+esc(b.subtitle)+'</p>':'')+'</div>'+inner+'</div></section>';
 });
 return html;
}
// This function is serialized into BOTH preview and public HTML, so interactions match too.
function bind(news){
 // srcdoc uses an asset base URL; intercept hashes to keep navigation in the draft.
 document.querySelectorAll('a[href^="#"]').forEach(function(a){a.onclick=function(e){
  e.preventDefault();var id=a.getAttribute('href').slice(1),target=id?document.getElementById(id):document.body;
  if(target)target.scrollIntoView({behavior:'smooth',block:'start'});
 };});
 document.querySelectorAll('[data-more]').forEach(function(b){b.onclick=function(){document.getElementById(b.dataset.more).classList.add('all');b.hidden=true;};});
 document.querySelectorAll('[data-news]').forEach(function(b){b.onclick=function(){
  var n=news[Number(b.dataset.news)],d=document.getElementById('news-dlg');if(!n)return;
  if(!d){d=document.createElement('dialog');d.id='news-dlg';d.innerHTML='<button type="button" class="x" aria-label="關閉">×</button><div class="hd"></div><div class="bd"></div>';document.body.appendChild(d);d.querySelector('.x').onclick=function(){d.close();};d.onclick=function(e){if(e.target===d)d.close();};}
  var hd=d.querySelector('.hd'),bd=d.querySelector('.bd');hd.textContent='';bd.textContent='';
  var time=document.createElement('time');time.textContent=n.date;hd.appendChild(time);var h=document.createElement('h3');h.textContent=n.title;hd.appendChild(h);var p=document.createElement('p');p.textContent=n.body;bd.appendChild(p);
  var grid=document.createElement('div');grid.className='ph';(n.photos||[]).forEach(function(p){var a=document.createElement('a');a.href=p.src;a.target='_blank';a.rel='noopener';var img=document.createElement('img');img.src=p.thumb||p.src;img.alt=n.title;img.loading='lazy';a.appendChild(img);grid.appendChild(a);});bd.appendChild(grid);d.showModal();
 };});
}
function renderDocument(c,options){
 c=c||{};options=options||{};var base=url(options.assetBase||''),news=(c.news||[]).filter(shown).slice().sort(function(a,b){return (Number(!!b.pin)-Number(!!a.pin))||String(b.date).localeCompare(String(a.date));}).map(function(n){var x=clone(n);x.photos=normalizePhotos(n.photos);return x;});
 var data=JSON.stringify(news).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
 return '<!doctype html>\n<html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>沙崙保安宮</title><meta name="description" content="桃園大園沙崙保安宮，奉祀保安廣澤尊王，民國三十六年創建。沿革、奉祀神明、廟景與石碑全文。">'+(base?'<base href="'+esc(base)+'">':'')+'<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@500;700;900&family=Noto+Sans+TC:wght@400;500;700&display=swap"><style>'+CSS.replace(/#newtemple/g,'.block-newtemple')+'</style></head><body>'+render(c)+'<script>('+bind.toString()+')('+data+');<\/script></body></html>\n';
}
return {library:library,defaults:clone(DEFAULTS),migrate:migrate,applySettings:applySettings,fromAdmin:fromAdmin,createBlock:createBlock,render:render,renderDocument:renderDocument};
})();
if (typeof module !== 'undefined' && module.exports) module.exports = BlockRenderer;
