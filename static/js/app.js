// BigQuery Release Notes Explorer App Logic

document.addEventListener('DOMContentLoaded', () => {
    // App State
    let releaseNotes = [];
    let currentFilter = 'all';
    let searchQuery = '';
    let selectedUpdate = null;

    // DOM Elements
    const timeline = document.getElementById('timeline');
    const feedLoading = document.getElementById('feed-loading');
    const feedError = document.getElementById('feed-error');
    const feedEmpty = document.getElementById('feed-empty');
    const errorMessage = document.getElementById('error-message');
    const retryBtn = document.getElementById('retry-btn');
    const resetFiltersBtn = document.getElementById('reset-filters-btn');
    
    const refreshBtn = document.getElementById('refresh-btn');
    const refreshIcon = refreshBtn.querySelector('.icon-refresh');
    const statusText = document.getElementById('status-text');
    const statusDot = document.querySelector('.status-dot');
    
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search-btn');
    const filterTabs = document.getElementById('filter-tabs');
    
    // Modal Elements
    const tweetModal = document.getElementById('tweet-modal');
    const refPreview = document.getElementById('ref-preview');
    const tweetTextarea = document.getElementById('tweet-textarea');
    const charCounter = document.getElementById('char-counter');
    const tweetPreviewText = document.getElementById('tweet-preview-text');
    const cancelTweetBtn = document.getElementById('cancel-tweet-btn');
    const publishTweetBtn = document.getElementById('publish-tweet-btn');
    const closeModalBtn = document.getElementById('close-modal-btn');
    
    const toastContainer = document.getElementById('toast-container');

    // SVG Icons
    const ICONS = {
        feature: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`,
        announcement: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>`,
        issue: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
        deprecation: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`,
        default: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`
    };

    // Initialize the app
    fetchReleases();

    // Event Listeners
    refreshBtn.addEventListener('click', () => fetchReleases(true));
    retryBtn.addEventListener('click', () => fetchReleases(true));
    resetFiltersBtn.addEventListener('click', resetFilters);
    
    // Search inputs
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim().toLowerCase();
        clearSearchBtn.style.display = searchQuery.length > 0 ? 'block' : 'none';
        renderTimeline();
    });

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        searchInput.focus();
        renderTimeline();
    });

    // Filtering tab selection
    filterTabs.addEventListener('click', (e) => {
        const tab = e.target.closest('.filter-tab');
        if (!tab) return;
        
        // Update active class
        document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        currentFilter = tab.dataset.filter;
        renderTimeline();
    });

    // Modal behavior
    closeModalBtn.addEventListener('click', closeTweetModal);
    cancelTweetBtn.addEventListener('click', closeTweetModal);
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) closeTweetModal();
    });
    
    // Update live tweet character count and preview
    tweetTextarea.addEventListener('input', updateTweetCounter);
    
    publishTweetBtn.addEventListener('click', publishTweet);

    // Fetch Release Notes
    function fetchReleases(forceRefresh = false) {
        setLoadingState(true);
        
        let url = '/api/releases';
        if (forceRefresh) {
            url += '?refresh=true';
            showToast('Fetching latest updates from Google Cloud...', 'info');
        }

        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(res => {
                if (res.success) {
                    releaseNotes = res.data;
                    updateRefreshStatus(res.source, res.last_updated);
                    setLoadingState(false);
                    renderTimeline();
                    
                    if (forceRefresh) {
                        showToast('Release notes updated successfully!', 'success');
                    }
                } else {
                    throw new Error(res.error || 'Unknown error occurred while fetching releases');
                }
            })
            .catch(err => {
                console.error('Fetch error:', err);
                errorMessage.textContent = err.message || 'Could not connect to the BigQuery feed.';
                setErrorState();
                showToast('Failed to fetch updates.', 'error');
            });
    }

    // State switchers
    function setLoadingState(isLoading) {
        if (isLoading) {
            feedLoading.style.display = 'flex';
            timeline.style.display = 'none';
            feedError.style.display = 'none';
            feedEmpty.style.display = 'none';
            
            refreshBtn.disabled = true;
            refreshIcon.classList.add('spinning');
            statusDot.className = 'status-dot pulsing';
            statusText.textContent = 'Updating...';
        } else {
            feedLoading.style.display = 'none';
            refreshBtn.disabled = false;
            refreshIcon.classList.remove('spinning');
        }
    }

    function setErrorState() {
        feedLoading.style.display = 'none';
        timeline.style.display = 'none';
        feedError.style.display = 'flex';
        feedEmpty.style.display = 'none';
        
        refreshBtn.disabled = false;
        refreshIcon.classList.remove('spinning');
        statusDot.className = 'status-dot';
        statusText.textContent = 'Connection failed';
    }

    function updateRefreshStatus(source, lastUpdatedTimestamp) {
        statusDot.className = 'status-dot';
        
        if (lastUpdatedTimestamp) {
            const date = new Date(lastUpdatedTimestamp * 1000);
            const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            statusText.textContent = `Updated at ${timeStr} (${source === 'cache' ? 'Cached' : 'Live'})`;
        } else {
            statusText.textContent = 'Updated';
        }
    }

    // Reset all filters
    function resetFilters() {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        
        currentFilter = 'all';
        document.querySelectorAll('.filter-tab').forEach(t => {
            t.classList.remove('active');
            if (t.dataset.filter === 'all') t.classList.add('active');
        });
        
        renderTimeline();
    }

    // Highlights matching text for keywords
    function highlightText(text, keyword) {
        if (!keyword) return text;
        
        // Escape regex characters
        const escapedKeyword = keyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(`(${escapedKeyword})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    // Render Timeline Feed
    function renderTimeline() {
        timeline.innerHTML = '';
        let matchedGroupsCount = 0;
        let totalUpdatesCount = 0;

        releaseNotes.forEach(group => {
            // Filter the updates in this group
            const filteredUpdates = group.updates.filter(update => {
                // Type Filter
                const matchesType = currentFilter === 'all' || update.type.toLowerCase() === currentFilter;
                
                // Text Search Filter (scans both the HTML content and the type title)
                const plainTextContent = update.content.replace(/<[^>]+>/g, '').toLowerCase();
                const matchesSearch = !searchQuery || 
                    plainTextContent.includes(searchQuery) || 
                    update.type.toLowerCase().includes(searchQuery);
                
                return matchesType && matchesSearch;
            });

            if (filteredUpdates.length > 0) {
                matchedGroupsCount++;
                totalUpdatesCount += filteredUpdates.length;

                // Create timeline group
                const groupElement = document.createElement('div');
                groupElement.className = 'timeline-group';

                // Date Title
                const dateMarker = document.createElement('div');
                dateMarker.className = 'timeline-date-marker';
                
                // Create timeline node anchor
                const node = document.createElement('div');
                node.className = 'timeline-node';
                dateMarker.appendChild(node);

                const dateTitle = document.createElement('h3');
                dateTitle.className = 'timeline-date-title';
                dateTitle.textContent = group.date;

                if (group.link) {
                    const linkIcon = document.createElement('a');
                    linkIcon.href = group.link;
                    linkIcon.target = '_blank';
                    linkIcon.className = 'date-link';
                    linkIcon.innerHTML = `
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="12" height="12">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg> Source
                    `;
                    dateTitle.appendChild(linkIcon);
                }

                dateMarker.appendChild(dateTitle);
                groupElement.appendChild(dateMarker);

                // Updates Container
                const updatesContainer = document.createElement('div');
                updatesContainer.className = 'timeline-updates';

                filteredUpdates.forEach(update => {
                    const card = document.createElement('div');
                    const normalizedType = update.type.toLowerCase();
                    const typeClass = ['feature', 'announcement', 'issue', 'deprecation'].includes(normalizedType) 
                        ? normalizedType 
                        : 'default';
                    
                    card.className = `update-card card-type-${typeClass}`;
                    card.dataset.id = update.id;

                    // Header
                    const header = document.createElement('div');
                    header.className = 'card-header';

                    // Badge
                    const badgeWrapper = document.createElement('div');
                    badgeWrapper.className = 'badge-wrapper';
                    
                    const badge = document.createElement('span');
                    badge.className = 'type-badge';
                    const iconSvg = ICONS[typeClass] || ICONS.default;
                    badge.innerHTML = `${iconSvg} ${update.type}`;
                    badgeWrapper.appendChild(badge);
                    header.appendChild(badgeWrapper);
                    
                    // Quick Action Link
                    const inlineTweetBtn = document.createElement('button');
                    inlineTweetBtn.className = 'btn-tweet-inline';
                    inlineTweetBtn.innerHTML = `
                        <svg class="x-logo-svg" viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                        <span>Tweet Update</span>
                    `;
                    
                    inlineTweetBtn.addEventListener('click', () => {
                        openTweetModal(update, group.date);
                    });

                    header.appendChild(inlineTweetBtn);
                    card.appendChild(header);

                    // Content
                    const content = document.createElement('div');
                    content.className = 'card-content';
                    
                    // Highlight query matches in description HTML safely (only text tags)
                    let displayHtml = update.content;
                    if (searchQuery) {
                        displayHtml = highlightText(displayHtml, searchQuery);
                    }
                    content.innerHTML = displayHtml;
                    card.appendChild(content);

                    updatesContainer.appendChild(card);
                });

                groupElement.appendChild(updatesContainer);
                timeline.appendChild(groupElement);
            }
        });

        // Show empty state if no match
        if (totalUpdatesCount === 0) {
            timeline.style.display = 'none';
            feedEmpty.style.display = 'flex';
        } else {
            timeline.style.display = 'block';
            feedEmpty.style.display = 'none';
        }
    }

    // Modal Functions
    function openTweetModal(update, dateStr) {
        selectedUpdate = update;
        
        // Strip html tag elements for preview reference
        const cleanPreview = update.content.replace(/<[^>]+>/g, ' ');
        refPreview.textContent = `[${update.type} - ${dateStr}] ${cleanPreview}`;
        
        // Pre-fill textarea with default draft generated by backend
        tweetTextarea.value = update.tweet_draft;
        
        // Update character count and preview card
        updateTweetCounter();
        
        // Show modal
        tweetModal.style.display = 'flex';
        // Timeout to allow DOM rendering for transitions
        setTimeout(() => {
            tweetModal.classList.add('active');
            tweetTextarea.focus();
        }, 10);
    }

    function closeTweetModal() {
        tweetModal.classList.remove('active');
        setTimeout(() => {
            tweetModal.style.display = 'none';
            selectedUpdate = null;
        }, 300); // match transition speed
    }

    function updateTweetCounter() {
        const text = tweetTextarea.value;
        const length = text.length;
        
        charCounter.textContent = `${length} / 280`;
        
        const wrapper = document.querySelector('.textarea-wrapper');
        const countBar = document.querySelector('.character-count-bar');
        
        if (length > 280) {
            countBar.classList.add('over-limit');
            publishTweetBtn.disabled = true;
            publishTweetBtn.style.opacity = '0.5';
            publishTweetBtn.style.cursor = 'not-allowed';
        } else {
            countBar.classList.remove('over-limit');
            publishTweetBtn.disabled = false;
            publishTweetBtn.style.opacity = '1';
            publishTweetBtn.style.cursor = 'pointer';
        }
        
        // Update tweet preview content
        tweetPreviewText.textContent = text || 'Write something...';
    }

    function publishTweet() {
        const text = tweetTextarea.value.trim();
        if (text.length === 0) {
            showToast('Tweet content cannot be empty!', 'error');
            return;
        }
        if (text.length > 280) {
            showToast('Tweet content exceeds the 280-character limit.', 'error');
            return;
        }
        
        // Open Twitter intent in new tab
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(twitterUrl, '_blank');
        
        closeTweetModal();
        showToast('Redirected to X (Twitter)!', 'success');
    }

    // Custom UI Notification Toast
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let icon = 'ℹ️';
        if (type === 'success') icon = '✅';
        if (type === 'error') icon = '⚠️';
        
        toast.innerHTML = `
            <span class="toast-icon">${icon}</span>
            <span class="toast-text">${message}</span>
        `;
        
        toastContainer.appendChild(toast);
        
        // Remove toast automatically after 3.5s
        setTimeout(() => {
            toast.classList.add('removing');
            toast.addEventListener('transitionend', () => {
                toast.remove();
            });
        }, 3500);
    }
});
