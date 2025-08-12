export function saveExportHistory(docName: string) {
    const hist = JSON.parse(localStorage.getItem("export_history") || "[]");
    hist.unshift({ docName, date: new Date().toISOString() });
    localStorage.setItem("export_history", JSON.stringify(hist.slice(0, 10)));
  }
  
  export function getExportHistory() {
    return JSON.parse(localStorage.getItem("export_history") || "[]");
  }
  