let allData = [];
let map, markers = [];

// 1. 데이터 로드
Papa.parse("barrier_free.csv", {
    download: true,
    header: true,
    skipEmptyLines: true,
    encoding: "EUC-KR", // 공공데이터 한글 깨짐 방지 핵심 설정
    complete: function(results) {
        console.log("데이터 수신 완료. 첫 번째 행:", results.data[0]);

        // 데이터 정제: 헤더 공백 제거 및 필수 데이터(위도, 경도) 확인
        allData = results.data.map(item => {
            let cleanItem = {};
            for (let key in item) {
                cleanItem[key.trim()] = item[key] ? item[key].trim() : "";
            }
            return cleanItem;
        }).filter(d => d['위도'] && d['경도'] && d['시설명']);

        if (allData.length > 0) {
            initFilters();
            initMap(37.5665, 126.9780);
            document.getElementById('info-list').innerHTML = `<p style="text-align:center; color:blue;">총 ${allData.length}건의 데이터를 성공적으로 불러왔습니다.</p>`;
        } else {
            document.getElementById('info-list').innerHTML = `<p style="text-align:center; color:red;">데이터 로드 실패: 위도/경도 컬럼명을 찾을 수 없습니다.</p>`;
        }
    }
});

function initFilters() {
    const sidos = [...new Set(allData.map(d => d['시도 명칭']))].filter(Boolean).sort();
    const sel = document.getElementById('sidoSelect');
    sel.innerHTML = '<option value="">시/도 선택</option>';
    sidos.forEach(s => {
        const opt = document.createElement("option");
        opt.value = s; opt.textContent = s;
        sel.appendChild(opt);
    });
}

function updateGugun() {
    const sido = document.getElementById('sidoSelect').value;
    const gugunSelect = document.getElementById('gugunSelect');
    gugunSelect.innerHTML = '<option value="">시/군/구 선택</option>';
    
    const guguns = [...new Set(allData.filter(d => d['시도 명칭'] === sido).map(d => d['시군구 명칭']))].filter(Boolean).sort();
    guguns.forEach(g => {
        const opt = document.createElement("option");
        opt.value = g; opt.textContent = g;
        gugunSelect.appendChild(opt);
    });
}

function searchPlaces() {
    const sido = document.getElementById('sidoSelect').value;
    const gugun = document.getElementById('gugunSelect').value;

    if(!sido) { alert("시/도를 선택해주세요."); return; }

    const filtered = allData.filter(d => 
        d['시도 명칭'] === sido && (!gugun || d['시군구 명칭'] === gugun)
    );

    clearMap();
    if (filtered.length > 0) {
        renderMarkers(filtered);
        renderList(filtered);
    } else {
        alert("검색 결과가 없습니다.");
    }
}

function renderList(data) {
    const list = document.getElementById('info-list');
    list.innerHTML = `<h2>📍 검색 결과 (${data.length}곳)</h2>`;
    
    data.forEach(d => {
        list.innerHTML += `
            <div class="place-card">
                <h3>
                    <span>${d['시설명']}</span>
                    <span class="category-badge">${d['카테고리1'] || '관광'}</span>
                </h3>
                <div class="info-item"><strong>📍 주소:</strong> ${d['도로명주소'] || d['지번주소']}</div>
                <div class="info-item"><strong>⏰ 운영:</strong> ${d['운영시간'] || '정보없음'}</div>
                <div class="accessibility-icons">
                    <span class="badge highlight">♿ 출입문: ${d['장애인용 출입문'] === 'Y' ? '✅' : '❌'}</span>
                    <span class="badge">🚻 화장실: ${d['장애인 화장실 유무']}</span>
                    <span class="badge">🅿️ 주차: ${d['장애인 전용 주차장 여부']}</span>
                </div>
            </div>`;
    });
}

function initMap(lat, lng) {
    const container = document.getElementById('map');
    map = new kakao.maps.Map(container, { center: new kakao.maps.LatLng(lat, lng), level: 8 });
}

function renderMarkers(data) {
    const bounds = new kakao.maps.LatLngBounds();
    data.forEach(d => {
        const pos = new kakao.maps.LatLng(Number(d['위도']), Number(d['경도']));
        const marker = new kakao.maps.Marker({ position: pos, map: map });
        markers.push(marker);
        bounds.extend(pos);

        const iw = new kakao.maps.InfoWindow({ content: `<div style="padding:5px;font-size:12px;">${d['시설명']}</div>` });
        kakao.maps.event.addListener(marker, 'click', () => iw.open(map, marker));
    });
    map.setBounds(bounds);
}

function clearMap() {
    markers.forEach(m => m.setMap(null));
    markers = [];
}
