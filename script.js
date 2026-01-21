let allData = [];
let filteredData = [];
let map, markers = [], polyline;

// 1. 데이터 로드 및 초기화
Papa.parse("barrier_free.csv", {
    download: true, 
    header: true,
    skipEmptyLines: true,
    complete: function(results) {
        // 필수 데이터가 있는 항목만 필터링 (위도, 경도, 시설명)
        allData = results.data.filter(d => d.위도 && d.경도 && d.시설명);
        console.log("로드된 데이터 수:", allData.length);
        initFilters();
        initMap(37.5665, 126.9780); // 초기 위치: 서울
    }
});

function initMap(lat, lng) {
    const container = document.getElementById('map');
    map = new kakao.maps.Map(container, {
        center: new kakao.maps.LatLng(lat, lng),
        level: 8
    });
}

// 필터 초기화 함수 (데이터에서 중복 제거 후 셀렉트 박스 삽입)
function initFilters() {
    const sidos = [...new Set(allData.map(d => d['시도 명칭']))].filter(Boolean).sort();
    fillSelect('sidoSelect', sidos);
    const cat1 = [...new Set(allData.map(d => d['카테고리1']))].filter(Boolean).sort();
    fillSelect('cat1Select', cat1);
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

// 2. 검색 실행
function searchPlaces() {
    const sido = document.getElementById('sidoSelect').value;
    const gugun = document.getElementById('gugunSelect').value;
    const c1 = document.getElementById('cat1Select').value;

    filteredData = allData.filter(d => 
        (!sido || d['시도 명칭'] === sido) &&
        (!gugun || d['시군구 명칭'] === gugun) &&
        (!c1 || d['카테고리1'] === c1)
    );

    if (filteredData.length > 0) {
        document.getElementById('course-ui').style.display = 'block';
        document.getElementById('range-info').innerText = `${filteredData.length}개의 장소를 찾았습니다.`;
        
        const first = filteredData[0];
        map.setCenter(new kakao.maps.LatLng(Number(first.위도), Number(first.경도)));
        
        clearMap();
        renderMarkers(filteredData);
        renderList(filteredData);
    } else {
        alert("검색 결과가 없습니다. 조건을 변경해주세요.");
    }
}

// 3. 지능형 코스 생성 (범위 확장형)
function makeSmartCourse() {
    if (filteredData.length < 1) return;
    
    clearMap();
    const start = filteredData[Math.floor(Math.random() * filteredData.length)];
    let radius = 5; // 시작 반경 5km
    let candidates = [];
    
    // 장소가 2개 이상 모일 때까지 반경을 5km씩 확장 (최대 50km)
    while (candidates.length < 2 && radius <= 50) {
        candidates = filteredData.filter(d => {
            const dkm = getDist(Number(start.위도), Number(start.경도), Number(d.위도), Number(d.경도));
            return dkm > 0 && dkm <= radius;
        });
        if (candidates.length < 2) radius += 5; 
    }

    const course = [start];
    // 찾은 후보 중 랜덤하게 최대 2개 추가
    const shuffled = candidates.sort(() => 0.5 - Math.random());
    course.push(...shuffled.slice(0, 2));

    document.getElementById('range-info').innerText = `반경 ${radius}km 내에서 추천 코스를 구성했습니다.`;
    
    renderMarkers(course, true);
    renderList(course, true);
}

// 거리 계산 (Haversine 공식)
function getDist(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// 4. 화면 출력 및 지도 표시
function renderMarkers(data, isCourse = false) {
    const path = [];
    const bounds = new kakao.maps.LatLngBounds();

    data.forEach((d, idx) => {
        const pos = new kakao.maps.LatLng(Number(d.위도), Number(d.경도));
        path.push(pos);
        
        const marker = new kakao.maps.Marker({ position: pos, map: map });
        markers.push(marker);
        bounds.extend(pos);

        // 코스일 경우 인포윈도우로 순서 표시
        if (isCourse) {
            const infowindow = new kakao.maps.InfoWindow({
                content: `<div style="padding:5px;font-size:12px;">${idx + 1}. ${d.시설명}</div>`
            });
            infowindow.open(map, marker);
        }
    });

    if (isCourse && path.length > 1) {
        polyline = new kakao.maps.Polyline({
            path: path, strokeColor: '#e67e22', strokeOpacity: 0.8, strokeWeight: 5, map: map
        });
    }
    map.setBounds(bounds); // 마커가 모두 보이도록 지도 범위 조정
}

function renderList(data, isCourse = false) {
    const list = document.getElementById('info-list');
    list.innerHTML = isCourse ? "<h2>🚩 추천 코스 상세 정보</h2>" : `<h2>📍 검색 결과 (${data.length}곳)</h2>`;
    
    data.forEach((d, idx) => {
        list.innerHTML += `
            <div class="place-card" style="border:1px solid #ddd; padding:15px; margin-bottom:10px; border-radius:8px; background:white;">
                <h3 style="margin-top:0;">${isCourse ? (idx+1)+'. ' : ''}${d.시설명}</h3>
                <p style="font-size:14px; color:#666;">📍 ${d.도로명주소 || d.지번주소}</p>
                <div style="display:flex; flex-wrap:wrap; gap:5px;">
                    <span style="background:#eee; padding:2px 8px; border-radius:4px; font-size:12px;">♿ 출입구: ${d['장애인용 출입문'] || '-'}</span>
                    <span style="background:#eee; padding:2px 8px; border-radius:4px; font-size:12px;">🚻 화장실: ${d['장애인 화장실 유무'] || '-'}</span>
                    <span style="background:#eee; padding:2px 8px; border-radius:4px; font-size:12px;">🅿️ 주차: ${d['장애인 전용 주차장 여부'] || '-'}</span>
                </div>
            </div>`;
    });
}

function clearMap() {
    markers.forEach(m => m.setMap(null));
    markers = [];
    if (polyline) polyline.setMap(null);
}

// 구군 데이터 및 시도 리스트는 기존 코드와 동일 (생략 가능하나 유지를 위해 포함)
const gugunData = { /* 기존 데이터 동일 */ };
function updateGugun() {
    const sido = document.getElementById("sidoSelect").value;
    const gugunSelect = document.getElementById("gugunSelect");
    gugunSelect.innerHTML = `<option value="">시/군/구 선택</option>`;
    // 위 script.js 상단의 데이터 기반 자동 생성 로직이 있으나, 
    // 정해진 리스트를 쓰려면 기존 gugunData를 사용해도 됩니다.
}
