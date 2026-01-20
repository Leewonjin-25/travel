let rawData = [];

// CSV 파일 로드 및 초기화
document.getElementById('csvFile').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            rawData = results.data;
            initFilters();
            filterData();
        }
    });
});

function initFilters() {
    const sidoSet = new Set(rawData.map(item => item['시도 명칭']).filter(Boolean));
    const cat1Set = new Set(rawData.map(item => item['카테고리1']).filter(Boolean));
    
    fillSelect('sido', Array.from(sidoSet).sort());
    fillSelect('cat1', Array.from(cat1Set).sort());
}

function fillSelect(id, items) {
    const select = document.getElementById(id);
    const currentVal = select.value;
    select.innerHTML = `<option value="">${id === 'sido' ? '시도 전체' : '카테고리 전체'}</option>`;
    items.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item;
        opt.textContent = item;
        select.appendChild(opt);
    });
    select.value = currentVal;
}

function filterData() {
    const sido = document.getElementById('sido').value;
    const cat1 = document.getElementById('cat1').value;
    const search = document.getElementById('searchInput').value.toLowerCase();

    const filtered = rawData.filter(item => {
        return (!sido || item['시도 명칭'] === sido) &&
               (!cat1 || item['카테고리1'] === cat1) &&
               (!search || (item['시설명'] && item['시설명'].toLowerCase().includes(search)));
    });

    renderList(filtered);
}

function renderList(data) {
    const listContainer = document.getElementById('nameList');
    document.getElementById('count').textContent = data.length;
    listContainer.innerHTML = '';

    if (data.length === 0) {
        listContainer.innerHTML = '<div class="text-center py-5 text-muted">검색 결과가 없습니다.</div>';
        return;
    }

    data.forEach(item => {
        const div = document.createElement('div');
        div.className = 'list-group-item';
        div.innerHTML = `
            <div>
                <div class="facility-name">${item['시설명']}</div>
                <div class="facility-info">${item['시도 명칭']} ${item['시군구 명칭']} | ${item['카테고리2']}</div>
            </div>
            <button class="btn btn-detail rounded-pill px-3">편의정보</button>
        `;
        div.onclick = () => {
            const toilet = item['장애인 화장실 유무'] === 'Y' ? '✅ 있음' : '❌ 없음';
            const specialPark = item['장애인 전용 주차장 여부'] === 'Y' ? '✅ 있음' : '❌ 없음';
            const freePark = item['무료주차 가능여부'] === 'Y' ? '✅ 가능' : '❌ 불가/정보없음';
            
            alert(`[${item['시설명']} 상세]\n\n🚻 장애인 화장실: ${toilet}\n♿ 장애인 주차장: ${specialPark}\n🅿️ 무료 주차: ${freePark}\n\n📍 주소: ${item['도로명주소'] || item['지번주소']}`);
        };
        listContainer.appendChild(div);
    });
}
