let allData = [];
let filteredData = [];
let map, markers = [], polyline;

// 1. 데이터 로드 (UTF-8 및 CP949 대응)
Papa.parse("barrier_free.csv", {
    download: true,
    header: true,
    skipEmptyLines: true,
    // 한글이 깨진다면 "CP949"로, 아니면 삭제하거나 "UTF-8"로 설정하세요.
    encoding: "UTF-8", 
    complete: function(results) {
        console.log("원본 헤더:", Object.keys(results.data[0]));

        // 데이터 정제: 모든 컬럼명의 앞뒤 공백 제거 및 위경도 숫자화
        allData = results.data.map(item => {
            let cleanItem = {};
            for (let key in item) {
                cleanItem[key.trim()] = item[key] ? item[key].trim() : "";
            }
            return cleanItem;
        }).filter(d => d['위도'] && d['경도']);

        if (allData.length > 0) {
            console.log("로드 성공:", allData.length, "건");
            document.getElementById('info-list').innerHTML = `<p class="guide">데이터 로드 완료! 지역을 선택해 주세요.</p>`;
            initFilters();
            initMap(37.5665, 126.9780);
        } else {
            document.getElementById('info-list').innerHTML = `<p class="guide" style="color:red;">데이터 형식 오류: '위도', '경도' 컬럼을 찾을 수 없습니다.</p>`;
        }
    }
});

// 초기 필터 세팅
function initFilters() {
    const sidos = [...new Set(allData.map(d => d['시도 명칭']))].filter(Boolean).sort();
    const sel = document.getElementById('sidoSelect');
    sidos.forEach(s => {
        const opt = document.createElement("option");
        opt.value = s; opt.textContent = s;
        sel.appendChild(opt);
    });
}

// 시군구 갱신
function updateGugun() {
    const sido = document.getElementById("sidoSelect").value;
    const gugunSelect = document.getElementById("gugunSelect");
    gugunSelect.innerHTML = `<option value="">시/군/구 선택</option>`;
    
    const guguns = [...new Set(allData.filter(d => d['시도 명칭'] === sido).map(d => d['시군구 명칭']))].filter(Boolean).sort();
    guguns.forEach(g => {
        const opt = document.createElement("option");
        opt.value = g; opt.textContent = g;
        gugunSelect.appendChild(opt);
    });
}

// 2. 장소 검색
function searchPlaces() {
    const sido = document.getElementById('sidoSelect').value;
    const gugun = document.getElementById('gugunSelect').value;

    filteredData = allData.filter(d => 
        (!sido || d['시도 명칭'] === sido) &&
        (!gugun || d['시군구 명칭'] === gugun)
    );

    if (filteredData.length > 0) {
        document.getElementById('course-ui').style.display = 'block';
        document.getElementById('range-info').innerText = `${filteredData.length}개의 장소를 찾았습니다.`;
        clearMap();
        renderMarkers(filteredData);
        renderList(filteredData);
    } else {
        alert("해당 조건에 맞는 장소가 없습니다.");
    }
}

// 3. 코스 생성 (반경 확장 알고리즘)
function makeSmartCourse() {
    if (filteredData.length === 0) return;
    clearMap();

    const start = filteredData[Math.floor(Math.random() * filteredData.length)];
    let radius = 5; // 5km부터 시작
    let candidates = [];

    while (candidates.length < 2 && radius <= 50) {
        candidates = filteredData.filter(d => {
            const dkm = getDist(Number(start.위도), Number(start.경도), Number(d.위도), Number(d.경도));
            return dkm > 0 && dkm <= radius;
        });
        if (candidates.length < 2) radius += 5;
    }

    const course = [start];
    const shuffled = candidates.sort(() => 0.5 - Math.random());
    course.push(...shuffled.slice(0, 2));

    document.getElementById('range-info').innerText = `반경 ${radius}km 내에서 코스를 구성했습니다.`;
    renderMarkers(course, true);
    renderList(course, true);
}

// 거리 계산 함수
function getDist(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// 4. 지도 및 리스트 출력
function initMap(lat, lng) {
    const container = document.getElementById('map');
    map = new kakao.maps.Map(container, { center: new kakao.maps.LatLng(lat, lng), level: 8 });
}

function renderMarkers(data, isCourse = false) {
    const path = [];
    const bounds = new kakao.maps.LatLngBounds();

    data.forEach((d, idx) => {
        const pos = new kakao.maps.LatLng(Number(d.위도), Number(d.경도));
        const marker = new kakao.maps.Marker({ position: pos, map: map });
        markers.push(marker);
        path.push(pos);
        bounds.extend(pos);

        if (isCourse) {
            const iw = new kakao.maps.InfoWindow({ content: `<div style="padding:5px;font-size:12px;">${idx+1}. ${d.시설명}</div>` });
            iw.open(map, marker);
        }
    });

    if (isCourse && path.length > 1) {
        polyline = new kakao.maps.Polyline({ path: path, strokeColor: '#FF0000', strokeWeight: 5, map: map });
    }
    map.setBounds(bounds);
}

function renderList(data, isCourse = false) {
    const list = document.getElementById('info-list');
    
    // 제목 설정
    list.innerHTML = isCourse ? 
        "<h2 style='color:#e67e22;'>🚩 추천 답사 코스</h2>" : 
        `<h2 style='color:#2c3e50;'>📍 검색 결과 (${data.length}곳)</h2>`;
    
    if (data.length === 0) {
        list.innerHTML += "<p>표시할 정보가 없습니다.</p>";
        return;
    }

    data.forEach((d, idx) => {
        // 데이터가 없을 경우를 대비한 기본값 처리
        const name = d['시설명'] || '이름 없음';
        const category = d['카테고리1'] || '분류 없음';
        const address = d['도로명주소'] || d['지번주소'] || '주소 정보 없음';
        const runtime = d['운영시간'] || '정보 없음';

        list.innerHTML += `
            <div class="place-card" style="border:1px solid #eee; padding:15px; margin-bottom:15px; border-radius:12px; background:#fff; box-shadow:0 2px 5px rgba(0,0,0,0.05);">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <h3 style="margin:0 0 8px 0; color:#333;">
                        ${isCourse ? (idx + 1) + '. ' : ''}${name}
                    </h3>
                    <span style="background:#e8f4fd; color:#007bff; padding:3px 8px; border-radius:5px; font-size:12px; font-weight:bold;">
                        ${category}
                    </span>
                </div>
                <p style="margin:5px 0; font-size:14px; color:#666;">📍 ${address}</p>
                <div style="margin-top:10px; padding-top:10px; border-top:1px dashed #eee; font-size:13px;">
                    <span style="display:block; margin-bottom:4px;">⏰ <strong>운영시간:</strong> ${runtime}</span>
                    <div style="display:flex; gap:10px; color:#555;">
                        <span>♿ 출입문: ${d['장애인용 출입문'] === 'Y' ? '✅ 가능' : '❌ 불가'}</span>
                        <span>🚻 화장실: ${d['장애인 화장실 유무'] === 'Y' ? '✅ 있음' : '❌ 없음'}</span>
                    </div>
                </div>
            </div>`;
    });
}

function clearMap() {
    markers.forEach(m => m.setMap(null));
    markers = [];
    if (polyline) polyline.setMap(null);
}
