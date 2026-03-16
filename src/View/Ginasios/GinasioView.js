import React, { useState } from "react";
import * as Style from "./styles"; 

export function GinasioView({ open, onClose, onSave, ginasio}) {
  const [formData, setFormData] = useState(
    ginasio || {
      nome: "",
      estado: "",
      cidade:"",
      isActive: true,
    }
  );

}