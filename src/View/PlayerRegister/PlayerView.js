import React, { useState } from "react";
// Importamos todos os estilos do arquivo que criamos
import * as Style from "./styles"; 

export function PlayerView({ open, onClose, onSave, player}) {
  const [formData, setFormData] = useState(
    player || {
      name: "",
      number: "",
      category: "",
      height: "",
      cpf: "",
      rg: "",
      position: "",
      dateOfBirth: "",
      team: "friendly",
      isActive: true,
    }
  );

  
}