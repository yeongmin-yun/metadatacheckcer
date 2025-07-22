/**
 * Manages toast notifications with stacking and animations.
 */

// Create a container for toasts and append it to the body
const toastContainer = document.createElement('div');
toastContainer.className = 'fixed top-5 right-5 z-50 space-y-2';
document.body.appendChild(toastContainer);

/**
 * Displays a toast message.
 * @param {string} message - The message to display.
 * @param {string} [type='info'] - The type of message ('success', 'error', 'warning', 'info').
 */
window.showToast = function(message, type = 'info') {
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
