document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const navText = document.querySelectorAll('aside nav span');
    const sidebarTitle = document.querySelector('aside h1');
    const toastContainer = document.getElementById('toast-container');
    const tooltip = document.getElementById('tooltip');
    const chartTooltipTrigger = document.getElementById('chart-tooltip-trigger');

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

    // Tooltip logic
    if (chartTooltipTrigger && tooltip) {
        chartTooltipTrigger.addEventListener('mouseenter', (event) => {
            tooltip.textContent = 'Click on a file label to scroll to its annotation card.';
            tooltip.classList.remove('hidden');
            const rect = event.target.getBoundingClientRect();
            tooltip.style.left = `${rect.left + window.scrollX}px`;
            tooltip.style.top = `${rect.bottom + window.scrollY + 5}px`;
        });

        chartTooltipTrigger.addEventListener('mouseleave', () => {
            tooltip.classList.add('hidden');
        });
    }
});

/**
 * Displays a toast message.
 * @param {string} message - The message to display.
 * @param {string} [type='info'] - The type of message ('success', 'error', 'warning', 'info').
 */
window.showToast = function(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    
    let bgColor, textColor;
    switch (type) {
        case 'success':
            bgColor = 'bg-green-500';
            textColor = 'text-white';
            break;
        case 'error':
            bgColor = 'bg-red-500';
            textColor = 'text-white';
            break;
        case 'warning':
            bgColor = 'bg-yellow-400';
            textColor = 'text-black';
            break;
        default:
            bgColor = 'bg-blue-500';
            textColor = 'text-white';
            break;
    }

    toast.className = `p-4 rounded-lg shadow-lg text-lg transition-all duration-500 ease-in-out transform translate-x-full opacity-0 ${bgColor} ${textColor}`;
    toast.textContent = message;

    // Add to the top of the container
    toastContainer.prepend(toast);

    // Animate in
    requestAnimationFrame(() => {
        toast.classList.remove('translate-x-full', 'opacity-0');
        toast.classList.add('translate-x-0', 'opacity-100');
    });

    // Set timeout to animate out and remove
    setTimeout(() => {
        // Start the fade-out animation
        toast.classList.add('opacity-0', 'translate-x-full');
        
        // Set a fallback timeout to remove the element after the animation duration
        setTimeout(() => {
            toast.remove();
        }, 600); // A little longer than the 500ms animation
    }, 3000);
};
