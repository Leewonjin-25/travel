let allHeritage = [];
let filteredHeritage = [];
let map;
let markers = [];
let polyline;

// 1. CSV 데이터 로드 (파일명을 'data.csv'로 준비하세요)
Papa.parse("data.csv", {
    download: true,
    header: true,
    complete: function(results) {
        allHeritage = results.data.filter(item => item.위도 && item.경도);
        console.log("데이터 로드 완료:", allHeritage.length);
    }
});

// 2. 지도 초기화
const mapContainer = document.getElementById('map');
const mapOption = { center: new kakao.maps.LatLng(37.5665, 126.9780), level: 8 };
map = new kakao.maps.Map(mapContainer, mapOption);

// 3. 거리 계산 함수 (Haversine 공식)
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// 4. 지역 검색
function searchHeritage() {
    const city = document.getElementById('cityInput').value;
    filteredHeritage = allHeritage.filter(item => item.시군구명.includes(city));

    if (filteredHeritage.length > 0) {
        document.getElementById('course-buttons').style.display = 'block';
        const first = filteredHeritage[0];
        map.setCenter(new kakao.maps.LatLng(first.위도, first.경도));
    } else {
        alert("데이터를 찾을 수 없습니다.");
    }
}

// 5. 코스 생성 (20km 제한)
function makeCourse(type) {
    clearMap();
    const start = filteredHeritage[Math.floor(Math.random() * filteredHeritage.length)];
    let candidates = filteredHeritage.filter(item => {
        const d = getDistance(start.위도, start.경도, item.위도, item.경도);
        return d > 0 && d <= 20;
    });

    if (type === 'era') candidates.sort((a, b) => a.시대.localeCompare(b.시대));
    else if (type === 'distance') {
        candidates.sort((a, b) => getDistance(start.위도, start.경도, a.위도, a.경도) - getDistance(start.위도, start.경도, b.위도, b.경도));
    }

    const course = [start, ...candidates.slice(0, 2)];
    displayCourse(course);
}

function displayCourse(course) {
    const path = [];
    const listEl = document.getElementById('course-list');
    listEl.innerHTML = "";

    course.forEach((h, idx) => {
        const pos = new kakao.maps.LatLng(h.위도, h.경도);
        path.push(pos);
        
        const marker = new kakao.maps.Marker({ position: pos, map: map });
        markers.push(marker);

        listEl.innerHTML += `<li><strong>${idx+1}. ${h.명칭}</strong> (${h.시대}) - ${h.주소}</li>`;
    });

    polyline = new kakao.maps.Polyline({ path: path, strokeWeight: 5, strokeColor: '#db4040', strokeOpacity: 0.7, strokeStyle: 'solid' });
    polyline.setMap(map);
}

function clearMap() {
    markers.forEach(m => m.setMap(null));
    if (polyline) polyline.setMap(null);
    markers = [];
}
