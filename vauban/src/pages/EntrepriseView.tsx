function displayField(field, mode) {
    if (mode === "online") {
      return field.isSensitive ? (["nom","prenom","email","telephone"].includes(field.name) ? field.value : "******") : field.value;
    }
    return field.value;
  }
  
  return (
    <div>
      {Object.keys(fields).map(key =>
        <div key={key}>
          <span>{key} : </span>
          <span>{displayField(fields[key], mode)}</span>
        </div>
      )}
    </div>
  )
