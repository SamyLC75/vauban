function displayField(field: any, mode: string) {
    if (mode === "online") {
      return field.isSensitive ? (["nom","prenom","email","telephone"].includes(field.name) ? field.value : "******") : field.value;
    }
    return field.value;
  }
  
 
