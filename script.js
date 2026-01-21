let allData = [];
let map, markers = [];

// 1. 데이터 로드
Papa.parse("barrier_free.csv", {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: function(results) {
        console.log("전체 데이터 확인:", results.data[0]); // 첫 줄 데이터 확인용
        
        // 데이터 정제: 위도/경도가 있는 것만 추출
        allData = results.data.filter(d => (d.위도 || d['위도']) && (d.경도 || d['경도']));
        
        if (allData.length > 0) {
            document.getElementById('info-list').innerHTML = `<p class="guide">${allData.length}건의 데이터를 로드했습니다. 지역을 선택해주세요.</p>`;
            initFilters();
            initMap(37.5665, 126.9780);
        } else {
            document.getElementById('info-list').innerHTML = `<p class="guide" style="color:red;">데이터 로드에 실패했습니다. CSV 컬럼명을 확인하세요.</p>`;
        }
    }
});

// 지도 초기화
function initMap(lat, lng) {
    const container = document.getElementById('map');
    map = new kakao.maps.Map(container, {
        center: new kakao.maps.LatLng(lat, lng),
        level: 8
    });
}

// 필터 설정
function initFilters() {
    // CSV 헤더 이름에 따라 '시도 명칭' 또는 '시도명' 등으로 수정 필요할 수 있음
    const sidoKey = allData[0]['시도 명칭'] ? '시도 명칭' : '시도명';
    const sidos = [...new Set(allData.map(d => d[sidoKey]))].filter(Boolean).sort();
    
    const sel = document.getElementById('sidoSelect');
    sidos.forEach(s => {
        const opt = document.createElement("option");
        opt.value = s; opt.textContent = s;
        sel.appendChild(opt);
    });
}

// 구군 업데이트 (allData 기반 자동 추출)
function updateGugun() {
    const sido = document.getElementById('sidoSelect').value;
    const sidoKey = allData[0]['시도 명칭'] ? '시도 명칭' : '시도명';
    const gugunKey = allData[0]['시군구 명칭'] ? '시군구 명칭' : '시군구명';
    
    const guguns = [...new Set(allData.filter(d => d[sidoKey] === sido).map(d => d[gugunKey]))].filter(Boolean).sort();
    
    const sel = document.getElementById('gugunSelect');
    sel.innerHTML = '<option value="">시/군/구 선택</option>';
    guguns.forEach(g => {
        const opt = document.createElement("option");
        opt.value = g; opt.textContent = g;
        sel.appendChild(opt);
    });
}

// 2. 검색 기능 (마커 표시 및 리스트 출력)
function searchPlaces() {
    const sido = document.getElementById('sidoSelect').value;
    const gugun = document.getElementById('gugunSelect').value;
    const sidoKey = allData[0]['시도 명칭'] ? '시도 명칭' : '시도명';
    const gugunKey = allData[0]['시군구 명칭'] ? '시군구 명칭' : '시군구명';

    const filtered = allData.filter(d => 
        (!sido || d[sidoKey] === sido) && 
        (!gugun || d[gugunKey] === gugun)
    );

    clearMap();
    if (filtered.length > 0) {
        renderMarkers(filtered);
        renderList(filtered);
    } else {
        alert("결과가 없습니다.");
    }
}

function renderMarkers(data) {
    const bounds = new kakao.maps.LatLngBounds();
    
    data.forEach(d => {
        const lat = Number(d.위도 || d['위도']);
        const lng = Number(d.경도 || d['경도']);
        const pos = new kakao.maps.LatLng(lat, lng);
        
        const marker = new kakao.maps.Marker({ position: pos, map: map });
        markers.push(marker);
        bounds.extend(pos);
        
        // 마커 클릭 시 이름 표시
        const iw = new kakao.maps.InfoWindow({ content: `<div style="padding:5px;font-size:12px;">${d.시설명 || d['시설명']}</div>` });
        kakao.maps.event.addListener(marker, 'click', () => iw.open(map, marker));
    });
    
    map.setBounds(bounds);
}

function renderList(data) {
    const list = document.getElementById('info-list');
    list.innerHTML = `<h2>📍 검색 결과 (${data.length}곳)</h2>`;
    data.forEach(d => {
        list.innerHTML += `
            <div class="place-card" style="border-bottom:1px solid #eee; padding:10px;">
                <strong>${d.시설명 || d['시설명']}</strong><br>
                <small>${d.도로명주소 || d.지번주소 || ''}</small>
            </div>`;
    });
}

function clearMap() {
    markers.forEach(m => m.setMap(null));
    markers = [];
}
