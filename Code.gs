/**
 * 한국경찰학원 업무분장 시스템 - Google Apps Script Backend
 * 
 * 이 스크립트는 Google Sheets를 데이터베이스로 사용하여
 * 여러 기기에서 업무분장 데이터를 공유할 수 있게 합니다.
 */

// ============================================
// 설정
// ============================================

const SHEET_NAMES = {
  ROLES: 'roles',
  TASKS: 'tasks',
  PRINCIPLES: 'principles'
};

// ============================================
// Web App 엔드포인트
// ============================================

function doGet(e) {
  const action = e.parameter.action;
  
  try {
    switch(action) {
      case 'getData':
        return returnJSON(getData());
      case 'getRoles':
        return returnJSON(getRoles());
      case 'getTasks':
        return returnJSON(getTasks());
      case 'getPrinciples':
        return returnJSON(getPrinciples());
      
      // 데이터 저장 (GET 방식)
      case 'saveData':
        const data = e.parameter.data ? JSON.parse(e.parameter.data) : null;
        return returnJSON(saveData(data));
      
      case 'updateTask':
        const task = e.parameter.task ? JSON.parse(e.parameter.task) : null;
        return returnJSON(updateTask(task));
      
      case 'addTask':
        const newTask = e.parameter.task ? JSON.parse(e.parameter.task) : null;
        return returnJSON(addTask(newTask));
      
      case 'deleteTask':
        const taskId = e.parameter.id ? parseInt(e.parameter.id) : null;
        return returnJSON(deleteTask(taskId));
      
      case 'updateRoles':
        const roles = e.parameter.roles ? JSON.parse(e.parameter.roles) : null;
        return returnJSON(updateRoles(roles));
      
      default:
        return returnJSON({ error: 'Invalid action' });
    }
  } catch (error) {
    return returnJSON({ error: error.toString() });
  }
}

function doPost(e) {
  const action = e.parameter.action;
  
  try {
    let data;
    if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    }
    
    let result;
    switch(action) {
      case 'saveData':
        result = saveData(data);
        break;
      case 'updateTask':
        result = updateTask(data);
        break;
      case 'addTask':
        result = addTask(data);
        break;
      case 'deleteTask':
        result = deleteTask(data.id);
        break;
      case 'updateRoles':
        result = updateRoles(data);
        break;
      default:
        result = { error: 'Invalid action' };
    }
    
    // CORS 헤더 추가
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================
// 헬퍼 함수
// ============================================

function returnJSON(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  
  // 시트가 없으면 생성
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    initializeSheet(sheet, sheetName);
  }
  
  return sheet;
}

function initializeSheet(sheet, sheetName) {
  // 각 시트별 헤더 설정
  if (sheetName === SHEET_NAMES.ROLES) {
    sheet.appendRow(['id', 'title', 'subtitle', 'icon', 'summary', 'kpi', 'main_duties', 'sub_duties', 'algorithm']);
  } else if (sheetName === SHEET_NAMES.TASKS) {
    sheet.appendRow(['id', 'category', 'task', 'main', 'sub']);
  } else if (sheetName === SHEET_NAMES.PRINCIPLES) {
    sheet.appendRow(['title', 'desc']);
  }
}

// ============================================
// 데이터 읽기 함수
// ============================================

function getData() {
  return {
    roles: getRoles(),
    tasks: getTasks(),
    principles: getPrinciples()
  };
}

function getRoles() {
  const sheet = getSheet(SHEET_NAMES.ROLES);
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) return []; // 헤더만 있으면 빈 배열
  
  const headers = data[0];
  const roles = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const role = {
      id: row[0],
      title: row[1],
      subtitle: row[2],
      icon: row[3],
      summary: row[4],
      kpi: parseJSON(row[5], []),
      main_duties: parseJSON(row[6], []),
      sub_duties: parseJSON(row[7], []),
      algorithm: row[8]
    };
    roles.push(role);
  }
  
  return roles;
}

function getTasks() {
  const sheet = getSheet(SHEET_NAMES.TASKS);
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) return [];
  
  const tasks = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const task = {
      id: parseInt(row[0]),
      category: row[1],
      task: row[2],
      main: row[3],
      sub: row[4]
    };
    tasks.push(task);
  }
  
  return tasks;
}

function getPrinciples() {
  const sheet = getSheet(SHEET_NAMES.PRINCIPLES);
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) return [];
  
  const principles = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const principle = {
      title: row[0],
      desc: row[1]
    };
    principles.push(principle);
  }
  
  return principles;
}

// ============================================
// 데이터 쓰기 함수
// ============================================

function saveData(data) {
  try {
    // Roles 저장
    if (data.roles) {
      saveRoles(data.roles);
    }
    
    // Tasks 저장
    if (data.tasks || data.taskRegistry) {
      saveTasks(data.tasks || data.taskRegistry);
    }
    
    // Principles 저장
    if (data.principles) {
      savePrinciples(data.principles);
    }
    
    return { success: true, message: 'Data saved successfully' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function saveRoles(roles) {
  const sheet = getSheet(SHEET_NAMES.ROLES);
  
  // 기존 데이터 삭제 (헤더 제외)
  if (sheet.getLastRow() > 1) {
    sheet.deleteRows(2, sheet.getLastRow() - 1);
  }
  
  // 새 데이터 추가
  roles.forEach(role => {
    sheet.appendRow([
      role.id,
      role.title,
      role.subtitle,
      role.icon,
      role.summary,
      JSON.stringify(role.kpi),
      JSON.stringify(role.main_duties),
      JSON.stringify(role.sub_duties),
      role.algorithm
    ]);
  });
}

function saveTasks(tasks) {
  const sheet = getSheet(SHEET_NAMES.TASKS);
  
  // 기존 데이터 삭제 (헤더 제외)
  if (sheet.getLastRow() > 1) {
    sheet.deleteRows(2, sheet.getLastRow() - 1);
  }
  
  // 새 데이터 추가
  tasks.forEach(task => {
    sheet.appendRow([
      task.id,
      task.category,
      task.task,
      task.main,
      task.sub
    ]);
  });
}

function savePrinciples(principles) {
  const sheet = getSheet(SHEET_NAMES.PRINCIPLES);
  
  // 기존 데이터 삭제 (헤더 제외)
  if (sheet.getLastRow() > 1) {
    sheet.deleteRows(2, sheet.getLastRow() - 1);
  }
  
  // 새 데이터 추가
  principles.forEach(principle => {
    sheet.appendRow([
      principle.title,
      principle.desc
    ]);
  });
}

// ============================================
// 개별 업무 관리 함수
// ============================================

function updateTask(task) {
  const sheet = getSheet(SHEET_NAMES.TASKS);
  const data = sheet.getDataRange().getValues();
  
  // 해당 ID의 행 찾기
  for (let i = 1; i < data.length; i++) {
    if (parseInt(data[i][0]) === task.id) {
      sheet.getRange(i + 1, 1, 1, 5).setValues([[
        task.id,
        task.category,
        task.task,
        task.main,
        task.sub
      ]]);
      return { success: true, message: 'Task updated' };
    }
  }
  
  return { success: false, error: 'Task not found' };
}

function addTask(task) {
  const sheet = getSheet(SHEET_NAMES.TASKS);
  
  sheet.appendRow([
    task.id,
    task.category,
    task.task,
    task.main,
    task.sub
  ]);
  
  return { success: true, message: 'Task added' };
}

function deleteTask(taskId) {
  const sheet = getSheet(SHEET_NAMES.TASKS);
  const data = sheet.getDataRange().getValues();
  
  // 해당 ID의 행 찾기
  for (let i = 1; i < data.length; i++) {
    if (parseInt(data[i][0]) === taskId) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'Task deleted' };
    }
  }
  
  return { success: false, error: 'Task not found' };
}

function updateRoles(roles) {
  saveRoles(roles);
  return { success: true, message: 'Roles updated' };
}

// ============================================
// 유틸리티 함수
// ============================================

function parseJSON(str, defaultValue) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return defaultValue;
  }
}
