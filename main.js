import { switchTab, filterButtons } from './js/app/ui.js';

/**
 * Main function to load data and set up the application.
 */
document.addEventListener('DOMContentLoaded', async () => {
    const sidebarContent = document.getElementById('sidebar-content');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const searchInput = document.getElementById('search-input');

    // --- Event Listeners ---

    // 1. Sidebar Toggle
    sidebarToggle.addEventListener('click', () => {
        if (sidebarContent.classList.contains('w-0')) {
            sidebarContent.classList.remove('w-0');
            sidebarContent.classList.add('w-72');
        } else {
            sidebarContent.classList.remove('w-72');
            sidebarContent.classList.add('w-0');
        }
    });

    // 2. Tab Switching
    document.querySelectorAll('#tab-container a').forEach(tabLink => {
        tabLink.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab(tabLink.id);
        });
    });

    // 3. Search Input
    searchInput.addEventListener('input', filterButtons);


    // --- Initial Setup ---
    
    // Set the initial tab to load
    switchTab('component-analyzer-tab');
});
