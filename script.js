Papa.parse("barrier_free.csv", {
    download: true, 
    header: true,
    complete: function(results) {
        console.log("로드된 원본 데이터:", results.data[0]); // 첫 번째 데이터를 콘솔에 찍어 헤더명 확인용
        
        allData = results.data.filter(d => d.위도 && d.경도);
        
        if(allData.length === 0) {
            alert("데이터 로드 실패: 위도/경도 컬럼명이 일치하는지 확인하세요.");
        } else {
            alert(allData.length + "건의 데이터를 성공적으로 불러왔습니다!");
            initFilters();
            initMap(37.5665, 126.9780);
        }
    },
    error: function(err) {
        alert("CSV 파일 로드 중 오류 발생: " + err);
    }
});
