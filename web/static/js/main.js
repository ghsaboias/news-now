$(document).ready(function() {
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