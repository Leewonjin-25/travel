let allData = [];
let filteredData = [];
let map, markers = [], polyline;

// 데이터 로드
Papa.parse("barrier_free.csv", {
    download: true, header: true, skipEmptyLines: true,
    complete: function(results) {
        // 컬럼명 공백 제거 처리
        allData = results.data.map(item => {
            let cleanItem = {};
            for (let key in item) { cleanItem[key.trim()] = item[key]; }
            return cleanItem;
        }).filter(d => d.위도 && d.경도);
        
        initFilters();
        initMap(37.5665, 126.9780);
    }
});

function initFilters() {
    const sidos = [...new Set(allData.map(d => d['시도 명칭']))].filter(Boolean).sort();
    const sel = document.getElementById('sidoSelect');
    sidos.forEach(s => { sel.innerHTML += `<option value="${s}">${s}</option>`; });
}

function updateGugun() {
    const sido = document.getElementById('sidoSelect').value;
    const guguns = [...new Set(allData.filter(d => d['시도 명칭'] === sido).map(d => d['시군구 명칭']))].filter(Boolean).sort();
    const sel = document.getElementById('gugunSelect');
    sel.innerHTML = '<option value="">시/군/구 선택</option>';
    guguns.forEach(g => { sel.innerHTML += `<option value="${g}">${g}</option>`; });
}

function searchPlaces() {
    const sido = document.getElementById('sidoSelect').value;
    const gugun = document.getElementById('gugunSelect').value;

    filteredData = allData.filter(d => (!sido || d['시도 명칭'] === sido) && (!gugun || d['시군구 명칭'] === gugun));

    if(filteredData.length > 0) {
        document.getElementById('course-ui').style.display = 'block';
        document.getElementById('range-info').innerText = `${filteredData.length}개의 장소를 발견했습니다.`;
        clearMap();
        renderMarkers(filteredData);
        renderList(filteredData);
    } else {
        alert("검색 결과가 없습니다.");
    }
}

function renderList(data, isCourse = false) {
    const list = document.getElementById('info-list');
    list.innerHTML = isCourse ? "<h2>🚩 추천 답사 코스</h2>" : `<h2>📍 검색 결과 (${data.length}곳)</h2>`;
    
    data.forEach((d, idx) => {
        list.innerHTML += `
            <div class="place-card">
                <h3>
                    <span>${isCourse ? (idx+1)+'. ' : ''}${d.시설명}</span>
                    <span class="category-badge">${d.카테고리1 || '관광지'}</span>
                </h3>
                <div class="info-item"><strong>📍 주소</strong> ${d.도로명주소 || d.지번주소}</div>
                <div class="info-item"><strong>⏰ 운영시간</strong> ${d.운영시간 || '정보없음'}</div>
                
                <div class="accessibility-icons">
                    <span class="badge highlight">♿ 출입문: ${d['장애인용 출입문'] === 'Y' ? '✅' : '❌'}</span>
                    <span class="badge">🚻 화장실: ${d['장애인 화장실 유무']}</span>
                    <span class="badge">🅿️ 장애인주차: ${d['장애인 전용 주차장 여부']}</span>
                    <span class="badge">📖 점자가이드: ${d['점자 가이드 여부']}</span>
                </div>
            </div>`;
    });
}

// 지도 관련 함수 (기존과 동일)
function initMap(lat, lng) {
    map = new kakao.maps.Map(document.getElementById('map'), { center: new kakao.maps.LatLng(lat, lng), level: 8 });
}

function renderMarkers(data, isCourse = false) {
    const bounds = new kakao.maps.LatLngBounds();
    const path = [];
    data.forEach(d => {
        const pos = new kakao.maps.LatLng(Number(d.위도), Number(d.경도));
        markers.push(new kakao.maps.Marker({ position: pos, map: map }));
        path.push(pos);
        bounds.extend(pos);
    });
    if(isCourse && path.length > 1) {
        polyline = new kakao.maps.Polyline({ path: path, strokeColor: '#e67e22', strokeWeight: 5, map: map });
    }
    map.setBounds(bounds);
}

function clearMap() {
    markers.forEach(m => m.setMap(null));
    markers = [];
    if(polyline) polyline.setMap(null);
}

function getDist(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function makeSmartCourse() {
    if (filteredData.length === 0) return;
    clearMap();
    const start = filteredData[Math.floor(Math.random() * filteredData.length)];
    let radius = 5, candidates = [];
    while (candidates.length < 2 && radius <= 50) {
        candidates = filteredData.filter(d => {
            const dkm = getDist(Number(start.위도), Number(start.경도), Number(d.위도), Number(d.경도));
            return dkm > 0 && dkm <= radius;
        });
        radius += 5;
    }
    const course = [start, ...candidates.sort(() => 0.5 - Math.random()).slice(0, 2)];
    renderMarkers(course, true);
    renderList(course, true);
}
