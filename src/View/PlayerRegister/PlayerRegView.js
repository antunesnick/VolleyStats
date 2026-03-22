import React, { useEffect, useState } from "react";
import * as Style from "./PlayerRegStyle"; 
import PositionControl from "../../Cotrol/PositionControl";

export function PlayerRegView({ open, onClose, onSave, player, categories = [] }) {
  const [formData, setFormData] = useState(
    player || {
      nome: "",
      numCamisa: "",
      altura: "",
      cpf: "",
      rg: "",
      posicaoId: "",
      dataNasc: "",
      foto: "", 
    }
  );

  const [positions, setPositions] = useState([]);

  useEffect(() => {
    if (open) {
      const positionControl = new PositionControl();
      positionControl.findAllPositions().then((data) => {
        setPositions(data);
      });
    }
  }, [open]);

  useEffect(() => {
    if (player) {
      setFormData(player);
    }
  }, [player]);

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
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                required
              />
            </Style.InputGroup>

            <Style.InputGroup>
              <Style.Label>Número *</Style.Label>
              <Style.Input
                type="text"
                value={formData.numCamisa}
                onChange={(e) => setFormData({ ...formData, numCamisa: e.target.value })}
                required
              />
            </Style.InputGroup>
          </Style.Row>

          <Style.Row>
            <Style.InputGroup>
              <Style.Label>Categoria</Style.Label>
              <Style.Select
                value={formData.category} // Se categoria for pra DB depois, mude para formData.categoria
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
              <Style.Label>Posição *</Style.Label>
              <Style.Select
                value={formData.posicaoId}
                onChange={(e) => setFormData({ ...formData, posicaoId: e.target.value })}
                required
              >
                <option value="">Selecione...</option>
                {positions.map((pos) => (
                  <option key={pos.id} value={pos.id}>
                    {pos.nome}
                  </option>
                ))}
              </Style.Select>
            </Style.InputGroup>
          </Style.Row>

          <Style.Row>
            <Style.InputGroup>
              <Style.Label>Altura (m)</Style.Label>
              <Style.Input
                type="text"
                placeholder="Ex: 1.85"
                value={formData.altura}
                onChange={(e) => setFormData({ ...formData, altura: e.target.value })}
              />
            </Style.InputGroup>

            <Style.InputGroup>
              <Style.Label>Data de Nascimento</Style.Label>
              <Style.Input
                type="date"
                value={formData.dataNasc}
                onChange={(e) => setFormData({ ...formData, dataNasc: e.target.value })}
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
          <Style.Row>
            <Style.InputGroup style={{ gridColumn: "span 2" }}>
              <Style.Label>Foto do Jogador</Style.Label>
              
              {}
              {formData.foto && (
                <img 
                  src={formData.foto} 
                  alt="Preview da Foto" 
                  style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px', marginBottom: '10px', border: '1px solid #ccc' }} 
                />
              )}
              
              {}
              <Style.Input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setFormData({ ...formData, foto: reader.result });
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </Style.InputGroup>
          </Style.Row>

          <Style.Footer>
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