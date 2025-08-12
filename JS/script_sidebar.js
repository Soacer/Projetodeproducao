document.addEventListener('DOMContentLoaded', function () {
    // Procura por todos os itens de menu que têm um submenu
    const menuItems = document.querySelectorAll('.nav-menu .menu-item-has-children > a');

    menuItems.forEach(item => {
        item.addEventListener('click', function (event) {
            // Previne a navegação se o link principal tiver href="#"
            if (this.getAttribute('href') === '#') {
                event.preventDefault();
            }

            // Alterna a classe 'active' no link clicado
            this.classList.toggle('active');

            // Encontra o submenu correspondente
            const submenu = this.nextElementSibling;

            // Alterna a altura do submenu para criar o efeito de abrir/fechar
            if (submenu.style.maxHeight) {
                submenu.style.maxHeight = null;
            } else {
                submenu.style.maxHeight = submenu.scrollHeight + "px";
            }
        });
    });

    // Se uma página de submenu estiver ativa, abre o menu pai
    const activeSubmenuLink = document.querySelector('.submenu a.active');
    if (activeSubmenuLink) {
        const submenu = activeSubmenuLink.closest('.submenu');
        const parentLink = submenu.previousElementSibling;
        parentLink.classList.add('active');
        submenu.style.maxHeight = submenu.scrollHeight + "px";
    }
});