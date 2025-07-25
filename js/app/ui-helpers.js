/**
 * Displays a toast message.
 * @param {string} message - The message to display.
 * @param {string} [type='info'] - The type of message ('success', 'error', 'info').
 */
export function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    const baseClasses = 'p-4 rounded-lg shadow-lg text-white transition-all duration-300 ease-in-out transform';
    const typeClasses = {
        info: 'bg-blue-500',
        success: 'bg-green-500',
        error: 'bg-red-500',
        warning: 'bg-yellow-500 text-black'
    };
    toast.className = `${baseClasses} ${typeClasses[type] || typeClasses.info}`;
    toast.textContent = message;

    // Set initial state for animation
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-20px)';

    container.appendChild(toast);

    // Animate in
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    }, 100);

    // Animate out and remove
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
