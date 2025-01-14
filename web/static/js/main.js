$(document).ready(function() {
    console.log('Document ready');
    
    // Theme toggle functionality
    const themeToggleDarkIcon = $('#theme-toggle-dark-icon');
    const themeToggleLightIcon = $('#theme-toggle-light-icon');
    
    // Set initial theme
    if (localStorage.getItem('color-theme') === 'dark' || 
        (!('color-theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        themeToggleLightIcon.removeClass('hidden');
        $('html').addClass('dark');
    } else {
        themeToggleDarkIcon.removeClass('hidden');
    }

    // Theme toggle handler
    $('#theme-toggle').on('click', function() {
        themeToggleDarkIcon.toggleClass('hidden');
        themeToggleLightIcon.toggleClass('hidden');
        
        if (localStorage.getItem('color-theme')) {
            if (localStorage.getItem('color-theme') === 'light') {
                $('html').addClass('dark');
                localStorage.setItem('color-theme', 'dark');
            } else {
                $('html').removeClass('dark');
                localStorage.setItem('color-theme', 'light');
            }
        } else {
            if ($('html').hasClass('dark')) {
                $('html').removeClass('dark');
                localStorage.setItem('color-theme', 'light');
            } else {
                $('html').addClass('dark');
                localStorage.setItem('color-theme', 'dark');
            }
        }
    });

    // Debug: Log if we can find the form
    const $form = $('#filter-form');
    console.log('Found filter form:', $form.length > 0);
    
    // Debug: Log initial form state
    console.log('Initial topics:', $('#filter-form input[name="topics"]').length);
    console.log('Initial timeframe inputs:', $('#filter-form input[name="timeframe"]').length);

    // Function to update filter styles
    function updateFilterStyles() {
        // Reset all filters
        $('#filter-form input[type="checkbox"]').each(function() {
            const $label = $(this).closest('label');
            if (this.checked) {
                $label.addClass('bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300');
                $label.removeClass('bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300');
            } else {
                $label.removeClass('bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300');
                $label.addClass('bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300');
            }
        });

        // Handle timeframe radio buttons
        $('#filter-form input[name="timeframe"]').each(function() {
            const $label = $(this).closest('label');
            if (this.checked) {
                $label.addClass('bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300');
                $label.removeClass('bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300');
            } else {
                $label.removeClass('bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300');
                $label.addClass('bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300');
            }
        });
    }

    // Initial style update
    updateFilterStyles();

    // Filter form handling
    $('#filter-form input[type="checkbox"], #filter-form input[type="radio"]').on('change', function(e) {
        // Update styles first
        updateFilterStyles();

        // Get all selected topics
        const selectedTopics = $('#filter-form input[name="topics"]:checked').map(function() {
            return this.value;
        }).get();
        
        // Get selected timeframe
        const timeframe = $('#filter-form input[name="timeframe"]:checked').val() || '';
        
        // Build query string
        const params = new URLSearchParams();
        selectedTopics.forEach(topic => params.append('topics', topic));
        if (timeframe) {
            params.append('timeframe', timeframe);
        }
        
        // Update URL without reloading
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        history.pushState({}, '', newUrl);
        
        // Show loading state
        $('.grid.gap-6').addClass('opacity-50');
        
        // Fetch filtered results
        $.get(`/filtered-news?${params.toString()}`)
            .done(function(html) {
                $('.grid.gap-6').html(html).removeClass('opacity-50');
            })
            .fail(function() {
                alert('Error loading news items');
                $('.grid.gap-6').removeClass('opacity-50');
            });
    });

    // Also try direct binding to inputs
    $('#filter-form input[name="topics"]').on('change', function(e) {
        console.log('Topic checkbox changed:', e.target.value, e.target.checked);
    });

    $('#filter-form input[name="timeframe"]').on('change', function(e) {
        console.log('Timeframe radio changed:', e.target.value);
    });

    // Auto-refresh status time
    setInterval(function() {
        $('.status-time').text(new Date().toLocaleTimeString() + ' UTC');
    }, 60000);

    // Initialize tooltips if tippy.js is loaded
    if (typeof tippy !== 'undefined') {
        tippy('[title]', {
            placement: 'bottom',
            arrow: true,
            theme: 'light-border',
        });
    }
});

// Convert UTC timestamps to local time
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('[data-local-time]').forEach(el => {
        const utc = new Date(el.getAttribute('datetime'));
        el.textContent = utc.toLocaleString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    });
}); 