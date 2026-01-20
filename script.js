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

    filteredData = allData.filter(d => 
        (!sido || d['시도 명칭'] === sido) &&
        (!gugun || d['시군구 명칭'] === gugun) &&
        (!c1 || d['카테고리1'] === c1) &&
        (!c2 || d['카테고리2'] === c2)
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
