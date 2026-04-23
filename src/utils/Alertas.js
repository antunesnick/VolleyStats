import Swal from 'sweetalert2';

// Cria um "molde" base para todos os toasts
const Toast = Swal.mixin({
  toast: true,
  position: 'top-end', // Aparece no canto superior direito
  showConfirmButton: false, // Esconde o botão de OK
  timer: 3000, // Some automaticamente após 3 segundos
  timerProgressBar: true, // Mostra uma barrinha de tempo diminuindo
  didOpen: (toast) => {
    // Pausa o tempo se o usuário passar o mouse por cima
    toast.onmouseenter = Swal.stopTimer;
    toast.onmouseleave = Swal.resumeTimer;
  }
});

export const Alertas = {
  
  sucesso: (mensagem) => {
    Toast.fire({
      icon: 'success',
      title: mensagem
    });
  },

  erro: (mensagem) => {
    Toast.fire({
      icon: 'error',
      title: mensagem
    });
  },

  aviso: (mensagem) => {
    Toast.fire({
      icon: 'warning',
      title: mensagem
    });
  },


  confirmacao: async (mensagem, titulo = 'Tem certeza?') => {
    const result = await Swal.fire({
      title: titulo,
      text: mensagem,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#007bff',
      cancelButtonColor: '#dc3545',
      confirmButtonText: 'Sim, confirmar',
      cancelButtonText: 'Cancelar'
    });
    return result.isConfirmed;
  }
};