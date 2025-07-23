document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const navText = document.querySelectorAll('aside nav span');
    const sidebarTitle = document.querySelector('aside h1');

    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            // Toggle sidebar visibility
            sidebar.classList.toggle('w-72');
            sidebar.classList.toggle('w-0');
            sidebar.classList.toggle('p-6');
            sidebar.classList.toggle('p-0');

            // Toggle visibility of text and title
            navText.forEach(span => {
                span.classList.toggle('hidden');
            });
            sidebarTitle.classList.toggle('hidden');

            // Adjust main content margin
            if (sidebar.classList.contains('w-72')) {
                mainContent.style.marginLeft = '18rem'; // w-72
                sidebarToggle.style.left = '19rem';
            } else {
                mainContent.style.marginLeft = '0rem';
                sidebarToggle.style.left = '1rem';
            }
        });
    }

    // Initial state check
    if (sidebar && mainContent && sidebar.classList.contains('w-72')) {
        mainContent.style.marginLeft = '18rem';
        sidebarToggle.style.left = '19rem';
    } else if (mainContent) {
        mainContent.style.marginLeft = '0rem';
        sidebarToggle.style.left = '1rem';
    }
});