let allData = [];
let filteredData = [];
let map, markers = [], polyline;

// 1. 데이터 로드 (파일명 변경 반영: barrier_free.csv)
Papa.parse("barrier_free.csv", {
    download: true, 
    header: true,
    skipEmptyLines: true,
    complete: function(results) {
        // 위도, 경도가 있는 데이터만 필터링하고 공백 제거
        allData = results.data.filter(d => d.위도 && d.경도 && d.위도.trim() !== "" && d.경도.trim() !== "");
        console.log("데이터 로드 완료:", allData.length, "건");
        initFilters();
        initMap(37.5665, 126.9780); // 초기 지도는 서울 중심
    },
    error: function(err) {
        console.error("CSV 파일을 불러오는 중 오류 발생:", err);
    }
});

function initFilters() {
    const sidos = [...new Set(allData.map(d => d['시도 명칭']))].filter(Boolean).sort();
    fillSelect('sidoSelect', sidos);
    const cat1 = [...new Set(allData.map(d => d['카테고리1']))].filter(Boolean).sort();
    fillSelect('cat1Select', cat1);
    const cat2 = [...new Set(allData.map(d => d['카테고리2']))].filter(Boolean).sort();
    fillSelect('cat2Select', cat2);
}

function fillSelect(id, list) {
    const sel = document.getElementById(id);
    list.forEach(item => {
        const opt = document.createElement("option");
        opt.value = item;
        opt.textContent = item;
        sel.appendChild(opt);
    });
}

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

// 2. 검색 기능
function searchPlaces() {
    const sido = document.getElementById('sidoSelect').value;
    const gugun = document.getElementById('gugunSelect').value;
    const c1 = document.getElementById('cat1Select').value;
    const c2 = document.getElementById('cat2Select').value;

    filteredData = allData.filter(d => 
        (!sido || d['시도 명칭'] === sido) &&
        (!gugun || d['시군구 명칭'] === gugun) &&
        (!c1 || d['카테고리1'] === c1) &&
        (!c2 || d['카테고리2'] === c2)
    );

    if(filteredData.length > 0) {
        document.getElementById('course-ui').style.display = 'block';
        const first = filteredData[0];
        const moveLatLon = new kakao.maps.LatLng(Number(first.위도), Number(first.경도));
        map.setCenter(moveLatLon);
        
        clearMap();
        renderMapMarkers(filteredData);
        renderList(filteredData);
    } else {
        alert("해당 조건의 장소가 없습니다.");
    }
}

// 3. 거리 계산 및 코스 생성 (숫자 변환 필수)
function getDist(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function makeCourse() {
    if (filteredData.length === 0) return;
    clearMap();
    
    const start = filteredData[Math.floor(Math.random() * filteredData.length)];
    const course = [start];
    
    // 거리 계산 시 Number로 형변환
    const candidates = filteredData.filter(d => {
        const dkm = getDist(Number(start.위도), Number(start.경도), Number(d.위도), Number(d.경도));
        return dkm > 0 && dkm <= 20;
    });

    const shuffled = candidates.sort(() => 0.5 - Math.random());
    course.push(...shuffled.slice(0, 2));

    renderMapMarkers(course, true); // 코스는 선을 그림
    renderList(course, true);
}

// 4. 정보 및 맵 렌더링
function renderList(data, isCourse = false) {
    const list = document.getElementById('info-list');
    list.innerHTML = isCourse ? "<h2>🚩 추천 답사 코스 (20km 이내)</h2>" : `<h2>📍 검색 결과 (${data.length}곳)</h2>`;
    
    data.forEach((d, idx) => {
        list.innerHTML += `
            <div class="place-card" style="border:1px solid #ddd; padding:15px; margin-bottom:10px; border-radius:8px;">
                <h3>${isCourse ? (idx+1)+'. ' : ''}${d.시설명} <small style="color:#666;">[${d.카테고리2}]</small></h3>
                <p>📍 ${d.도로명주소 || d.지번주소}</p>
                <div class="accessibility-icons" style="font-size:0.9em; color:#555;">
                    <span class="badge">♿ 전용출입문: ${d['장애인용 출입문'] || '정보없음'}</span> | 
                    <span class="badge">🚻 장애인화장실: ${d['장애인 화장실 유무'] || '정보없음'}</span> | 
                    <span class="badge">🅿️ 전용주차: ${d['장애인 전용 주차장 여부'] || '정보없음'}</span>
                </div>
            </div>`;
    });
}

function initMap(lat, lng) {
    const container = document.getElementById('map');
    const options = { center: new kakao.maps.LatLng(lat, lng), level: 8 };
    map = new kakao.maps.Map(container, options);
}

function renderMapMarkers(data, drawLine = false) {
    const path = [];
    markers = [];
    
    data.forEach(d => {
        const pos = new kakao.maps.LatLng(Number(d.위도), Number(d.경도));
        path.push(pos);
        const marker = new kakao.maps.Marker({ position: pos, map: map });
        markers.push(marker);
    });

    if (drawLine && data.length > 1) {
        polyline = new kakao.maps.Polyline({
            path: path,
            strokeColor: '#FF0000',
            strokeOpacity: 0.8,
            strokeWeight: 4,
            map: map
        });
    }
}

function clearMap() {
    if(polyline) polyline.setMap(null);
    markers.forEach(m => m.setMap(null));
    markers = [];
}
