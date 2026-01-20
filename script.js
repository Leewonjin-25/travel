let allData = [];
let filteredData = [];
let map, markers = [], polyline;

// 1. 데이터 로드 및 초기 셀렉트 박스 세팅
Papa.parse("한국문화정보원_전국 배리어프리 문화예술관광지_20221125.csv", {
    download: true, header: true,
    complete: function(results) {
        allData = results.data.filter(d => d.위도 && d.경도);
        initFilters();
    }
});

function initFilters() {
    const sidos = [...new Set(allData.map(d => d['시도 명칭']))].sort();
    fillSelect('sidoSelect', sidos);
    const cat1 = [...new Set(allData.map(d => d['카테고리1']))].sort();
    fillSelect('cat1Select', cat1);
    const cat2 = [...new Set(allData.map(d => d['카테고리2']))].sort();
    fillSelect('cat2Select', cat2);
}

function fillSelect(id, list) {
    const sel = document.getElementById(id);
    list.forEach(item => { if(item) sel.innerHTML += `<option value="${item}">${item}</option>`; });
}

function updateGugun() {
    const sido = document.getElementById('sidoSelect').value;
    const guguns = [...new Set(allData.filter(d => d['시도 명칭'] === sido).map(d => d['시군구 명칭']))].sort();
    const sel = document.getElementById('gugunSelect');
    sel.innerHTML = '<option value="">시/군/구 선택</option>';
    guguns.forEach(g => { if(g) sel.innerHTML += `<option value="${g}">${g}</option>`; });
}

// 2. 검색 기능
function searchPlaces() {
    const sido = document.getElementById('sidoSelect').value;
    const gugun = document.getElementById('gugunSelect').value;
    const c1 = document.getElementById('cat1Select').value;
    const c2 = document.getElementById('cat2Select').value;

    filteredList = rawData.filter(r =>
  (!sido || r["광역시도"] === sido) &&
  (!gugun || r["시군구명"] === gugun) &&
  (!cat1 || r["대분류"] === cat1) &&
  (!cat2 || r["중분류"] === cat2)
);

    );

    if(filteredData.length > 0) {
        document.getElementById('course-ui').style.display = 'block';
        initMap(filteredData[0].위도, filteredData[0].경도);
        renderList(filteredData);
    } else {
        alert("해당 조건의 장소가 없습니다.");
    }
}

// 3. 거리 계산 및 코스 생성 (20km)
function getDist(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function makeCourse() {
    clearMap();
    const start = filteredData[Math.floor(Math.random() * filteredData.length)];
    const course = [start];
    
    const candidates = filteredData.filter(d => {
        const dkm = getDist(start.위도, start.경도, d.위도, d.경도);
        return dkm > 0 && dkm <= 20;
    });

    // 20km 이내 장소 중 랜덤하게 2곳 더 추가
    const shuffled = candidates.sort(() => 0.5 - Math.random());
    course.push(...shuffled.slice(0, 2));

    renderMapMarkers(course);
    renderList(course, true);
}

// 4. 정보 출력 (모든 배리어프리 항목 포함)
function renderList(data, isCourse = false) {
    const list = document.getElementById('info-list');
    list.innerHTML = isCourse ? "<h2>🚩 추천 답사 코스</h2>" : `<h2>📍 검색 결과 (${data.length}곳)</h2>`;
    
    data.forEach((d, idx) => {
        list.innerHTML += `
            <div class="place-card">
                <h3>${isCourse ? (idx+1)+'. ' : ''}${d.시설명} <small>${d.카테고리2}</small></h3>
                <p>📍 ${d.도로명주소}</p>
                <div class="accessibility-icons">
                    <span class="badge">⏰ 운영: ${d.운영시간}</span>
                    <span class="badge">🅿️ 무료주차: ${d['무료주차 가능여부']}</span>
                    <span class="badge">💰 입장료: ${d['입장료 유무 여부']}</span>
                    <span class="badge">🚪 전용출입문: ${d['장애인용 출입문']}</span>
                    <span class="badge">♿ 휠체어대여: ${d['휠체어 대여 가능 여부']}</span>
                    <span class="badge">🚻 장애인화장실: ${d['장애인 화장실 유무']}</span>
                    <span class="badge">🅿️ 전용주차장: ${d['장애인 전용 주차장 여부']}</span>
                    <span class="badge">🚛 대형주차: ${d['대형주차장 가능여부']}</span>
                    <span class="badge">🦮 안내견동반: ${d['시각장애인 안내견 동반 가능 여부']}</span>
                    <span class="badge">📖 점자가이드: ${d['점자 가이드 여부']}</span>
                </div>
            </div>`;
    });
}

function initMap(lat, lng) {
    const container = document.getElementById('map');
    map = new kakao.maps.Map(container, { center: new kakao.maps.LatLng(lat, lng), level: 5 });
}

function renderMapMarkers(course) {
    const path = [];
    course.forEach(d => {
        const pos = new kakao.maps.LatLng(d.위도, d.경도);
        path.push(pos);
        new kakao.maps.Marker({ position: pos, map: map });
    });
    polyline = new kakao.maps.Polyline({ path: path, strokeColor: '#e67e22', strokeOpacity: 0.8, strokeWeight: 5, map: map });
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

// 시/도 채우기
const sidoSelect = document.getElementById("sidoSelect");
sidoList.forEach(sido => {
  const opt = document.createElement("option");
  opt.value = sido;
  opt.textContent = sido;
  sidoSelect.appendChild(opt);
});

// 시/군/구 갱신
function updateGugun() {
  const sido = document.getElementById("sidoSelect").value;
  const gugunSelect = document.getElementById("gugunSelect");
  gugunSelect.innerHTML = `<option value="">시/군/구 선택</option>`;
  if (!gugunData[sido]) return;

  gugunData[sido].forEach(gugun => {
    const opt = document.createElement("option");
    opt.value = gugun;
    opt.textContent = gugun;
    gugunSelect.appendChild(opt);
  });
}
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
let filteredList = [];
let courseList = [];

function searchPlaces() {
  const sido = sidoSelect.value;
  const gugun = gugunSelect.value;
  const cat1 = cat1Select.value;
  const cat2 = cat2Select.value;

  filteredList = rawData.filter(r =>
    (!sido || r["시도"] === sido) &&
    (!gugun || r["시군구"] === gugun) &&
    (!cat1 || r["대분류"] === cat1) &&
    (!cat2 || r["중분류"] === cat2)
  );

  // 선택 조건에 맞는 게 위로 오도록
  showList(filteredList);

  // 기준 위치: 첫 번째 장소
  if (filteredList.length > 0) {
    makeCourseBase(filteredList[0]);
  }
}
function showList(list) {
  const box = document.getElementById("info-list");
  box.innerHTML = "";

  list.forEach((p, i) => {
    box.innerHTML += `
      <div class="item">
        <strong>${i+1}. ${p["시설명"]}</strong><br>
        ${p["주소"]}
      </div>
    `;
  });
}
function makeCourseBase(base) {
  const baseLat = parseFloat(base["위도"]);
  const baseLng = parseFloat(base["경도"]);

  const near = filteredList.filter(p => {
    const d = getDistance(
      baseLat, baseLng,
      parseFloat(p["위도"]), parseFloat(p["경도"])
    );
    p._dist = d;
    return d <= 20;
  });

  // 거리순 정렬
  near.sort((a,b) => a._dist - b._dist);

  // 3개 코스 만들기
  courseList = [
    near.slice(0, 3),
    near.slice(3, 6),
    near.slice(6, 9)
  ];

  document.getElementById("course-ui").style.display = "block";
}
function makeCourse(idx) {
  const list = courseList[idx];
  const box = document.getElementById("course-result");
  box.innerHTML = `<h3>추천 코스 ${String.fromCharCode(65+idx)}</h3>`;

  if (!list || list.length === 0) {
    box.innerHTML += "해당 코스가 없습니다.";
    return;
  }

  list.forEach((p,i) => {
    box.innerHTML += `
      <div>
        ${i+1}. ${p["시설명"]} (${p._dist.toFixed(1)}km)<br>
        ${p["주소"]}
      </div>
    `;
  });
}
