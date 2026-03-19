import React, { useState } from "react";
// Importamos todos os estilos do arquivo que criamos
import * as Style from "./PlayerStyle"; 

export function PlayerView({ open, onClose, onSave, player, categories = [] }) {
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSave) onSave(formData);
    if (onClose) onClose();
  };

  if (!open) return null;

  return (
    <Style.Overlay>
      <Style.Modal>
        <Style.CloseIcon onClick={onClose} type="button">
          {/* Ícone de X */}
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </Style.CloseIcon>

        <Style.Title>
          {player ? "Editar Jogador" : "Novo Jogador"}
        </Style.Title>
        
        <Style.Form onSubmit={handleSubmit}>
          <Style.Row>
            <Style.InputGroup>
              <Style.Label>Nome *</Style.Label>
              <Style.Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </Style.InputGroup>

            <Style.InputGroup>
              <Style.Label>Número *</Style.Label>
              <Style.Input
                type="text"
                value={formData.number}
                onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                required
              />
            </Style.InputGroup>
          </Style.Row>

          <Style.Row>
            <Style.InputGroup>
              <Style.Label>Categoria</Style.Label>
              <Style.Select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="">Selecione...</option>
                {categories.map((cat) => (
                  <option key={cat.id || cat.name} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </Style.Select>
            </Style.InputGroup>

            <Style.InputGroup>
              <Style.Label>Posição</Style.Label>
              <Style.Select
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              >
                <option value="">Selecione...</option>
                <option value="Levantador">Levantador</option>
                <option value="Ponteiro">Ponteiro</option>
                <option value="Central">Central</option>
                <option value="Oposto">Oposto</option>
                <option value="Líbero">Líbero</option>
              </Style.Select>
            </Style.InputGroup>
          </Style.Row>

          <Style.Row>
            <Style.InputGroup>
              <Style.Label>Altura (m)</Style.Label>
              <Style.Input
                type="text"
                placeholder="Ex: 1.85"
                value={formData.height}
                onChange={(e) => setFormData({ ...formData, height: e.target.value })}
              />
            </Style.InputGroup>

            <Style.InputGroup>
              <Style.Label>Data de Nascimento</Style.Label>
              <Style.Input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
              />
            </Style.InputGroup>
          </Style.Row>

          <Style.Row>
            <Style.InputGroup>
              <Style.Label>CPF</Style.Label>
              <Style.Input
                type="text"
                placeholder="000.000.000-00"
                value={formData.cpf}
                onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
              />
            </Style.InputGroup>

            <Style.InputGroup>
              <Style.Label>RG</Style.Label>
              <Style.Input
                type="text"
                placeholder="00.000.000-0"
                value={formData.rg}
                onChange={(e) => setFormData({ ...formData, rg: e.target.value })}
              />
            </Style.InputGroup>
          </Style.Row>

          <Style.Footer>
            {}
            <Style.Button type="button" onClick={onClose} $variant="cancel">
              Cancelar
            </Style.Button>
            <Style.Button type="submit">
              {player ? "Salvar" : "Criar Jogador"}
            </Style.Button>
          </Style.Footer>
        </Style.Form>
      </Style.Modal>
    </Style.Overlay>
  );
}