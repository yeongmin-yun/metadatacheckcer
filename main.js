import { switchTab, filterButtons } from './js/app/ui.js';
import { setCurrentWorkVersion, state } from './js/app/state.js';
import { loadComponentAnalyzerData } from './js/app/data-loader.js';
import { showAnalysisView } from './js/app/chart-drawer.js';

/**
 * Main function to load data and set up the application.
 */
document.addEventListener('DOMContentLoaded', async () => {
    const sidebarContent = document.getElementById('sidebar-content');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const searchInput = document.getElementById('search-input');
    const workVersionSelector = document.getElementById('work-version-selector');

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

    // 4. Work Version Change
    workVersionSelector.addEventListener('click', async (e) => {
        const button = e.target.closest('.work-version-btn');
        if (!button) return;

        const newVersion = button.dataset.version;
        if (newVersion === state.currentWorkVersion) return; // Do nothing if the same version is clicked

        setCurrentWorkVersion(newVersion);

        // Update button styles
        document.querySelectorAll('.work-version-btn').forEach(btn => {
            btn.classList.remove('bg-white', 'text-blue-600', 'shadow');
            btn.classList.add('text-gray-600');
        });
        button.classList.add('bg-white', 'text-blue-600', 'shadow');
        button.classList.remove('text-gray-600');

        // Reload component data
        await loadComponentAnalyzerData();
        
        // Re-filter buttons if there is a search term
        filterButtons();

        // If a component was being viewed, refresh its analysis view
        if (state.currentSelectedComponent) {
            showAnalysisView(state.currentSelectedComponent);
        }
    });

    // --- Initial Setup ---
    
    // Set the initial tab to load
    switchTab('component-analyzer-tab');
});
