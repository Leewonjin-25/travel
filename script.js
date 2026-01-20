let rawData = [];
let filteredList = [];
let courseList = [];

/* CSV 불러오기 */
Papa.parse("한국문화정보원_전국 배리어프리 문화예술관광지_20221125.csv", {
  download: true,
  header: true,
  complete: function (results) {
    rawData = results.data;
    console.log("샘플:", rawData[0]);
    makeSido();
    makeCat1();
  }
});

/* 거리 계산 */
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

/* 시도 채우기 */
function makeSido() {
  const sel = document.getElementById("sidoSelect");
  const set = new Set();
  rawData.forEach(r => r["광역시도"] && set.add(r["광역시도"]));
  set.forEach(v => {
    const o = document.createElement("option");
    o.value = v; o.textContent = v;
    sel.appendChild(o);
  });
}

/* 구군 채우기 */
function updateGugun() {
  const sido = sidoSelect.value;
  const sel = gugunSelect;
  sel.innerHTML = `<option value="">시/군/구 선택</option>`;
  const set = new Set();
  rawData.forEach(r => {
    if (r["광역시도"] === sido && r["시군구명"]) set.add(r["시군구명"]);
  });
  set.forEach(v => {
    const o = document.createElement("option");
    o.value = v; o.textContent = v;
    sel.appendChild(o);
  });
}

/* 대분류 */
function makeCat1() {
  const sel = cat1Select;
  const set = new Set();
  rawData.forEach(r => r["대분류"] && set.add(r["대분류"]));
  set.forEach(v => {
    const o = document.createElement("option");
    o.value = v; o.textContent = v;
    sel.appendChild(o);
  });
}

/* 중분류 */
cat1Select.addEventListener("change", () => {
  const v = cat1Select.value;
  cat2Select.innerHTML = `<option value="">중분류(카테고리2)</option>`;
  const set = new Set();
  rawData.forEach(r => {
    if (r["대분류"] === v && r["중분류"]) set.add(r["중분류"]);
  });
  set.forEach(x => {
    const o = document.createElement("option");
    o.value = x; o.textContent = x;
    cat2Select.appendChild(o);
  });
});

/* 조회 */
function searchPlaces() {
  const s = sidoSelect.value;
  const g = gugunSelect.value;
  const c1 = cat1Select.value;
  const c2 = cat2Select.value;

  filteredList = rawData.filter(r =>
    (!s || r["광역시도"] === s) &&
    (!g || r["시군구명"] === g) &&
    (!c1 || r["대분류"] === c1) &&
    (!c2 || r["중분류"] === c2)
  );

  showList(filteredList);

  if (filteredList.length > 0) makeCourseBase(filteredList[0]);
}

/* 목록 출력 */
function showList(list) {
  const box = document.getElementById("info-list");
  box.innerHTML = "";
  list.forEach((p,i) => {
    box.innerHTML += `
      <div class="item">
        <b>${i+1}. ${p["시설명"]}</b><br>
        ${p["주소"]}
      </div>
    `;
  });
}

/* 20km 코스 만들기 */
function makeCourseBase(base) {
  const bl = parseFloat(base["위도"]);
  const bg = parseFloat(base["경도"]);

  const near = filteredList.filter(p => {
    const d = getDistance(bl,bg,parseFloat(p["위도"]),parseFloat(p["경도"]));
    p._dist = d;
    return d <= 20;
  }).sort((a,b)=>a._dist-b._dist);

  courseList = [
    near.slice(0,3),
    near.slice(3,6),
    near.slice(6,9)
  ];

  document.getElementById("course-ui").style.display="block";
}

/* 코스 보기 */
function makeCourse(idx) {
  const box = document.getElementById("course-result");
  box.innerHTML = `<h3>추천 코스 ${["A","B","C"][idx]}</h3>`;
  const list = courseList[idx];
  if (!list || list.length===0) {
    box.innerHTML += "해당 코스 없음";
    return;
  }
  list.forEach((p,i)=>{
    box.innerHTML += `
      <div>
        ${i+1}. ${p["시설명"]} (${p._dist.toFixed(1)}km)<br>
        ${p["주소"]}
      </div>
    `;
  });
}


function clearMap() { if(polyline) polyline.setMap(null); markers.forEach(m => m.setMap(null)); }
const sidoList = [
  "서울특별시","부산광역시","대구광역시","인천광역시","광주광역시",
  "대전광역시","울산광역시","세종특별자치시",
  "경기도","강원특별자치도","충청북도","충청남도",
  "전라북도","전라남도","경상북도","경상남도","제주특별자치도"
];

const gugunData = {
  "서울특별시": ["종로구","중구","용산구","성동구","광진구","동대문구","중랑구","성북구","강북구","도봉구","노원구","은평구","서대문구","마포구","양천구","강서구","구로구","금천구","영등포구","동작구","관악구","서초구","강남구","송파구","강동구"],

  "부산광역시": ["중구","서구","동구","영도구","부산진구","동래구","남구","북구","해운대구","사하구","금정구","강서구","연제구","수영구","사상구","기장군"],

  "대구광역시": ["중구","동구","서구","남구","북구","수성구","달서구","달성군","군위군"],

  "인천광역시": ["중구","동구","미추홀구","연수구","남동구","부평구","계양구","서구","강화군","옹진군"],

  "광주광역시": ["동구","서구","남구","북구","광산구"],

  "대전광역시": ["동구","중구","서구","유성구","대덕구"],

  "울산광역시": ["중구","남구","동구","북구","울주군"],

  "세종특별자치시": ["세종시"],

  "경기도": ["수원시","성남시","의정부시","안양시","부천시","광명시","평택시","동두천시","안산시","고양시","과천시","구리시","남양주시","오산시","시흥시","군포시","의왕시","하남시","용인시","파주시","이천시","안성시","김포시","화성시","광주시","양주시","포천시","여주시","연천군","가평군","양평군"],

  "강원특별자치도": ["춘천시","원주시","강릉시","동해시","태백시","속초시","삼척시","홍천군","횡성군","영월군","평창군","정선군","철원군","화천군","양구군","인제군","고성군","양양군"],

  "충청북도": ["청주시","충주시","제천시","보은군","옥천군","영동군","증평군","진천군","괴산군","음성군","단양군"],

  "충청남도": ["천안시","공주시","보령시","아산시","서산시","논산시","계룡시","당진시","금산군","부여군","서천군","청양군","홍성군","예산군","태안군"],

  "전라북도": ["전주시","군산시","익산시","정읍시","남원시","김제시","완주군","진안군","무주군","장수군","임실군","순창군","고창군","부안군"],

  "전라남도": ["목포시","여수시","순천시","나주시","광양시","담양군","곡성군","구례군","고흥군","보성군","화순군","장흥군","강진군","해남군","영암군","무안군","함평군","영광군","장성군","완도군","진도군","신안군"],

  "경상북도": ["포항시","경주시","김천시","안동시","구미시","영주시","영천시","상주시","문경시","경산시","의성군","청송군","영양군","영덕군","청도군","고령군","성주군","칠곡군","예천군","봉화군","울진군","울릉군"],

  "경상남도": ["창원시","진주시","통영시","사천시","김해시","밀양시","거제시","양산시","의령군","함안군","창녕군","고성군","남해군","하동군","산청군","함양군","거창군","합천군"],

  "제주특별자치도": ["제주시","서귀포시"]
};

