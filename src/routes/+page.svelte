<script lang="ts">
	import { onMount } from 'svelte';
	
	interface Site {
		id: number;
		name: string;
		description: string | null;
		url: string;
		categoryId: number;
		createdAt: Date;
	}
	
	interface Category {
		id: number;
		name: string;
		description: string | null;
	}
	
	let bookmarksByCategory: Record<string, Site[]> = {};
	let categories: Category[] = [];
	let loading = true;
	let error = '';
	
	// Form states
	let showCategoryForm = false;
	let showSiteForm = false;
	let categoryForm = { name: '', description: '' };
	let siteForm = { name: '', url: '', description: '', categoryId: '' };
	let submitting = false;
	
	// Edit states
	let editingBookmark: Site | null = null;
	let showEditForm = false;
	
	// Search functionality
	let searchQuery = '';
	let filteredBookmarksByCategory: Record<string, Site[]> = {};
	
	// Toast notifications
	let toastMessage = '';
	let toastType: 'success' | 'error' = 'success';
	let showToast = false;
	
	// Collapsible categories state
	let collapsedCategories: Record<string, boolean> = {};
	
	// Collapsible cards state
	let expandedCards: Record<number, boolean> = {};
	
	function showToastNotification(message: string, type: 'success' | 'error' = 'success') {
		toastMessage = message;
		toastType = type;
		showToast = true;
		setTimeout(() => {
			showToast = false;
		}, 3000);
	}
	
	function toggleCategory(categoryName: string) {
		collapsedCategories[categoryName] = !collapsedCategories[categoryName];
		collapsedCategories = { ...collapsedCategories }; // Trigger reactivity
	}
	
	function toggleCard(cardId: number, event: MouseEvent) {
		event.stopPropagation(); // Prevent opening the URL
		expandedCards[cardId] = !expandedCards[cardId];
		expandedCards = { ...expandedCards }; // Trigger reactivity
	}
	
	function startEditBookmark(bookmark: Site, event: MouseEvent) {
		event.stopPropagation();
		editingBookmark = { ...bookmark };
		showEditForm = true;
	}
	
	function cancelEdit() {
		editingBookmark = null;
		showEditForm = false;
	}
	
	function filterBookmarks(query: string) {
		if (!query.trim()) {
			filteredBookmarksByCategory = bookmarksByCategory;
			return;
		}
		
		const filtered: Record<string, Site[]> = {};
		const lowercaseQuery = query.toLowerCase();
		
		Object.entries(bookmarksByCategory).forEach(([categoryName, sites]) => {
			const matchingSites = sites.filter(site => 
				site.name.toLowerCase().includes(lowercaseQuery) ||
				site.description?.toLowerCase().includes(lowercaseQuery) ||
				site.url.toLowerCase().includes(lowercaseQuery) ||
				categoryName.toLowerCase().includes(lowercaseQuery)
			);
			
			if (matchingSites.length > 0) {
				filtered[categoryName] = matchingSites;
			}
		});
		
		filteredBookmarksByCategory = filtered;
	}
	
	// React to search query changes
	$: filterBookmarks(searchQuery);
	
	function getSiteFallbackLetter(siteName: string): string {
		return siteName.charAt(0).toUpperCase();
	}
	
	function getFaviconUrl(url: string): string {
		try {
			const domain = new URL(url).hostname;
			return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
		} catch {
			return 'https://www.google.com/s2/favicons?domain=example.com&sz=32';
		}
	}

	onMount(() => {
		loadData();
	});

	async function loadData() {
		try {
			loading = true;
			// Fetch bookmarks
			const bookmarksResponse = await fetch('/api/bookmarks');
			if (!bookmarksResponse.ok) throw new Error('Failed to fetch bookmarks');
			bookmarksByCategory = await bookmarksResponse.json();
			
			// Fetch categories
			const categoriesResponse = await fetch('/api/categories');
			if (!categoriesResponse.ok) throw new Error('Failed to fetch categories');
			categories = await categoriesResponse.json();
			
			// Initialize filtered bookmarks
			filteredBookmarksByCategory = bookmarksByCategory;
			
			loading = false;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Unknown error';
			loading = false;
		}
	}

	async function createCategory() {
		if (!categoryForm.name.trim()) return;
		
		try {
			submitting = true;
			const response = await fetch('/api/categories', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(categoryForm)
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to create category');
			}

			// Reset form and reload data
			categoryForm = { name: '', description: '' };
			showCategoryForm = false;
			await loadData();
			showToastNotification('Category created successfully!');
		} catch (err) {
			showToastNotification(err instanceof Error ? err.message : 'Failed to create category', 'error');
		} finally {
			submitting = false;
		}
	}

	async function createSite() {
		if (!siteForm.name.trim() || !siteForm.url.trim() || !siteForm.categoryId) return;
		
		try {
			submitting = true;
			const response = await fetch('/api/bookmarks', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(siteForm)
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to create bookmark');
			}

			// Reset form and reload data
			siteForm = { name: '', url: '', description: '', categoryId: '' };
			showSiteForm = false;
			await loadData();
			showToastNotification('Bookmark created successfully!');
		} catch (err) {
			showToastNotification(err instanceof Error ? err.message : 'Failed to create bookmark', 'error');
		} finally {
			submitting = false;
		}
	}
	
	async function updateBookmark() {
		if (!editingBookmark) return;
		
		try {
			submitting = true;
			const response = await fetch(`/api/bookmarks/${editingBookmark.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: editingBookmark.name,
					url: editingBookmark.url,
					description: editingBookmark.description,
					categoryId: editingBookmark.categoryId
				})
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to update bookmark');
			}

			cancelEdit();
			await loadData();
			showToastNotification('Bookmark updated successfully!');
		} catch (err) {
			showToastNotification(err instanceof Error ? err.message : 'Failed to update bookmark', 'error');
		} finally {
			submitting = false;
		}
	}
	
	async function deleteBookmark(bookmarkId: number, event: MouseEvent) {
		event.stopPropagation();
		
		if (!confirm('Are you sure you want to delete this bookmark?')) return;
		
		try {
			const response = await fetch(`/api/bookmarks/${bookmarkId}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to delete bookmark');
			}

			await loadData();
			showToastNotification('Bookmark deleted successfully!');
		} catch (err) {
			showToastNotification(err instanceof Error ? err.message : 'Failed to delete bookmark', 'error');
		}
	}
</script>

<svelte:head>
	<title>Bookmark Manager</title>
</svelte:head>

<main>
	<header>
		<h1>📚 My Bookmark Manager</h1>
		<div class="actions">
			<button on:click={() => showCategoryForm = !showCategoryForm} class="btn btn-secondary">
				✨ Add Category
			</button>
			<button on:click={() => showSiteForm = !showSiteForm} class="btn btn-primary">
				🔖 Add Bookmark
			</button>
		</div>
	</header>

	<!-- Search Bar -->
	<div class="search-container">
		<div class="search-input-wrapper">
			<span class="search-icon">🔍</span>
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Search bookmarks..."
				class="search-input"
			/>
			{#if searchQuery}
				<button class="clear-search" on:click={() => searchQuery = ''}>✕</button>
			{/if}
		</div>
	</div>

	<!-- Toast Notification -->
	{#if showToast}
		<div class="toast toast-{toastType}">
			{toastMessage}
		</div>
	{/if}

	<!-- Category Form -->
	{#if showCategoryForm}
		<div class="form-container">
			<h3>✨ Add New Category</h3>
			<form on:submit|preventDefault={createCategory}>
				<input
					bind:value={categoryForm.name}
					placeholder="Category name"
					required
				/>
				<input
					bind:value={categoryForm.description}
					placeholder="Description (optional)"
				/>
				<div class="form-actions">
					<button type="submit" disabled={submitting || !categoryForm.name.trim()}>
						{submitting ? 'Creating...' : 'Create Category'}
					</button>
					<button type="button" on:click={() => showCategoryForm = false}>Cancel</button>
				</div>
			</form>
		</div>
	{/if}

	<!-- Site Form -->
	{#if showSiteForm}
		<div class="form-container">
			<h3>🔖 Add New Bookmark</h3>
			<form on:submit|preventDefault={createSite}>
				<input
					bind:value={siteForm.name}
					placeholder="Site name"
					required
				/>
				<input
					bind:value={siteForm.url}
					placeholder="URL (https://example.com)"
					type="url"
					required
				/>
				<select bind:value={siteForm.categoryId} required>
					<option value="">Select a category</option>
					{#each categories as category}
						<option value={category.id}>{category.name}</option>
					{/each}
				</select>
				<input
					bind:value={siteForm.description}
					placeholder="Description (optional)"
				/>
				<div class="form-actions">
					<button type="submit" disabled={submitting || !siteForm.name.trim() || !siteForm.url.trim() || !siteForm.categoryId}>
						{submitting ? 'Creating...' : 'Create Bookmark'}
					</button>
					<button type="button" on:click={() => showSiteForm = false}>Cancel</button>
				</div>
			</form>
		</div>
	{/if}

	<!-- Edit Form -->
	{#if showEditForm && editingBookmark}
		<div class="form-container">
			<h3>✏️ Edit Bookmark</h3>
			<form on:submit|preventDefault={updateBookmark}>
				<input
					bind:value={editingBookmark.name}
					placeholder="Site name"
					required
				/>
				<input
					bind:value={editingBookmark.url}
					placeholder="URL (https://example.com)"
					type="url"
					required
				/>
				<select bind:value={editingBookmark.categoryId} required>
					<option value="">Select a category</option>
					{#each categories as category}
						<option value={category.id}>{category.name}</option>
					{/each}
				</select>
				<input
					bind:value={editingBookmark.description}
					placeholder="Description (optional)"
				/>
				<div class="form-actions">
					<button type="submit" disabled={submitting || !editingBookmark.name.trim() || !editingBookmark.url.trim()}>
						{submitting ? 'Updating...' : 'Update Bookmark'}
					</button>
					<button type="button" on:click={cancelEdit}>Cancel</button>
				</div>
			</form>
		</div>
	{/if}
	
	{#if loading}
		<div class="loading">
			<div class="spinner"></div>
			<p>Loading your awesome bookmarks...</p>
		</div>
	{:else if error}
		<p class="error">❌ Error: {error}</p>
	{:else}
		<div class="bookmark-container">
			{#each Object.entries(filteredBookmarksByCategory) as [categoryName, sites]}
				{#if sites.length > 0}
					<section class="category-section">
						<h2 class="category-header" on:click={() => toggleCategory(categoryName)}>
							<span class="category-toggle" class:collapsed={collapsedCategories[categoryName]}>
								{collapsedCategories[categoryName] ? '▶' : '▼'}
							</span>
							{categoryName}
							<span class="category-count">({sites.length})</span>
						</h2>
						
						{#if !collapsedCategories[categoryName]}
							<div class="bookmark-grid">
								{#each sites as site}
									<div class="bookmark-card" class:expanded={expandedCards[site.id]}>
										<div class="bookmark-compact" on:click={() => window.open(site.url, '_blank')}>
											<div class="bookmark-header">
												<div class="site-logo-container">
													<img 
														src={getFaviconUrl(site.url)} 
														alt="{site.name} logo" 
														class="site-logo"
														on:error={(e) => {
															e.currentTarget.style.display = 'none';
															e.currentTarget.nextElementSibling.style.display = 'flex';
														}}
													/>
													<div class="site-logo-fallback" style="display: none;">
														{getSiteFallbackLetter(site.name)}
													</div>
												</div>
												<div class="bookmark-info">
													<h3>{site.name}</h3>
													<a href={site.url} target="_blank" rel="noopener noreferrer" on:click|stopPropagation>
														{new URL(site.url).hostname}
													</a>
												</div>
											</div>
											
											<div class="bookmark-actions">
												<button 
													class="action-btn edit-btn" 
													on:click={(e) => startEditBookmark(site, e)}
													title="Edit bookmark"
												>
													✏️
												</button>
												<button 
													class="action-btn delete-btn" 
													on:click={(e) => deleteBookmark(site.id, e)}
													title="Delete bookmark"
												>
													🗑️
												</button>
												{#if site.description}
													<button 
														class="expand-btn" 
														on:click={(e) => toggleCard(site.id, e)}
														title={expandedCards[site.id] ? 'Collapse' : 'Expand'}
													>
														<span class="expand-icon" class:expanded={expandedCards[site.id]}>
															{expandedCards[site.id] ? '▼' : '◀'}
														</span>
													</button>
												{/if}
											</div>
										</div>
										
										{#if site.description && expandedCards[site.id]}
											<div class="bookmark-expanded">
												<p class="bookmark-description">{site.description}</p>
											</div>
										{/if}
									</div>
								{/each}
							</div>
						{/if}
					</section>
				{/if}
			{/each}
			
			{#if Object.keys(filteredBookmarksByCategory).length === 0 && !loading}
				<div class="empty-state">
					{#if searchQuery}
						<h3>🔍 No bookmarks found</h3>
						<p>No bookmarks match your search for "{searchQuery}"</p>
						<button class="btn btn-secondary" on:click={() => searchQuery = ''}>Clear search</button>
					{:else}
						<h3>📚 No bookmarks yet</h3>
						<p>Start building your bookmark collection!</p>
						<button class="btn btn-primary" on:click={() => showSiteForm = true}>Add your first bookmark</button>
					{/if}
				</div>
			{/if}
		</div>
	{/if}
</main>

<style>
	:global(body) {
		background: linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%);
		color: #e0e0e0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
		margin: 0;
		min-height: 100vh;
	}

	main {
		max-width: 1400px;
		margin: 0 auto;
		padding: 3rem 2rem;
		min-height: 100vh;
	}
	
	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
		padding: 2rem 0;
		border-bottom: 1px solid #333;
	}
	
	/* Search Bar */
	.search-container {
		margin-bottom: 3rem;
	}
	
	.search-input-wrapper {
		position: relative;
		max-width: 500px;
		margin: 0 auto;
	}
	
	.search-icon {
		position: absolute;
		left: 1rem;
		top: 50%;
		transform: translateY(-50%);
		font-size: 1.2rem;
		color: rgba(255, 255, 255, 0.5);
		pointer-events: none;
	}
	
	.search-input {
		width: 100%;
		padding: 1rem 1rem 1rem 3rem;
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 12px;
		font-size: 1.1rem;
		background: rgba(30, 30, 30, 0.8);
		color: #fff;
		backdrop-filter: blur(20px);
		transition: all 0.3s ease;
	}
	
	.search-input:focus {
		outline: none;
		border-color: #4ecdc4;
		box-shadow: 0 0 20px rgba(78, 205, 196, 0.3);
		transform: scale(1.02);
	}
	
	.search-input::placeholder {
		color: rgba(255, 255, 255, 0.5);
	}
	
	.clear-search {
		position: absolute;
		right: 1rem;
		top: 50%;
		transform: translateY(-50%);
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.5);
		cursor: pointer;
		font-size: 1.2rem;
		transition: color 0.3s ease;
	}
	
	.clear-search:hover {
		color: #ff6b6b;
	}
	
	/* Toast Notifications */
	.toast {
		position: fixed;
		top: 2rem;
		right: 2rem;
		padding: 1rem 1.5rem;
		border-radius: 8px;
		color: white;
		font-weight: 600;
		z-index: 1000;
		animation: slideInRight 0.3s ease-out;
		max-width: 300px;
	}
	
	.toast-success {
		background: linear-gradient(135deg, #00b894, #00a085);
		border: 1px solid #00a085;
	}
	
	.toast-error {
		background: linear-gradient(135deg, #ff6b6b, #ee5a24);
		border: 1px solid #ee5a24;
	}
	
	@keyframes slideInRight {
		from {
			opacity: 0;
			transform: translateX(100%);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}
	
	/* Empty State */
	.empty-state {
		text-align: center;
		padding: 4rem 2rem;
		margin: 2rem 0;
	}
	
	.empty-state h3 {
		font-size: 1.8rem;
		margin-bottom: 1rem;
		color: rgba(255, 255, 255, 0.8);
	}
	
	.empty-state p {
		font-size: 1.1rem;
		color: rgba(255, 255, 255, 0.6);
		margin-bottom: 2rem;
		padding: 0;
	}
	
	h1 {
		font-size: 3.5rem;
		font-weight: 700;
		background: linear-gradient(135deg, #ff6b6b, #4ecdc4, #45b7d1);
		background-clip: text;
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		margin: 0;
		text-shadow: 0 0 30px rgba(255, 107, 107, 0.3);
	}
	
	.actions {
		display: flex;
		gap: 1.5rem;
	}
	
	.btn {
		padding: 1rem 2rem;
		border: none;
		border-radius: 12px;
		cursor: pointer;
		font-weight: 600;
		font-size: 1.1rem;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		position: relative;
		overflow: hidden;
	}
	
	.btn::before {
		content: '';
		position: absolute;
		top: 0;
		left: -100%;
		width: 100%;
		height: 100%;
		background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
		transition: left 0.5s;
	}
	
	.btn:hover::before {
		left: 100%;
	}
	
	.btn-primary {
		background: linear-gradient(135deg, #ff6b6b, #ee5a24);
		color: white;
		box-shadow: 0 8px 32px rgba(255, 107, 107, 0.3);
	}
	
	.btn-secondary {
		background: linear-gradient(135deg, #4ecdc4, #44a08d);
		color: white;
		box-shadow: 0 8px 32px rgba(78, 205, 196, 0.3);
	}
	
	.btn:hover {
		transform: translateY(-2px);
		box-shadow: 0 12px 40px rgba(255, 107, 107, 0.4);
	}
	
	.btn-secondary:hover {
		box-shadow: 0 12px 40px rgba(78, 205, 196, 0.4);
	}
	
	.form-container {
		background: rgba(30, 30, 30, 0.8);
		backdrop-filter: blur(20px);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 20px;
		padding: 3rem;
		margin-bottom: 3rem;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
		animation: slideIn 0.3s ease-out;
	}
	
	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateY(-20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	
	.form-container h3 {
		margin: 0 0 2rem 0;
		color: #fff;
		font-size: 1.8rem;
		font-weight: 600;
	}
	
	.form-container form {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}
	
	.form-container input,
	.form-container select {
		padding: 1rem 1.5rem;
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 12px;
		font-size: 1.1rem;
		background: rgba(255, 255, 255, 0.05);
		color: #fff;
		transition: all 0.3s ease;
		backdrop-filter: blur(10px);
	}
	
	.form-container input:focus,
	.form-container select:focus {
		outline: none;
		border-color: #4ecdc4;
		box-shadow: 0 0 20px rgba(78, 205, 196, 0.3);
		transform: scale(1.02);
	}
	
	.form-container input::placeholder {
		color: rgba(255, 255, 255, 0.5);
	}
	
	.form-container select option {
		background: #1a1a1a;
		color: #fff;
	}
	
	.form-actions {
		display: flex;
		gap: 1.5rem;
		margin-top: 1rem;
	}
	
	.form-actions button {
		padding: 1rem 2rem;
		border: none;
		border-radius: 12px;
		cursor: pointer;
		font-weight: 600;
		font-size: 1.1rem;
		transition: all 0.3s ease;
	}
	
	.form-actions button[type="submit"] {
		background: linear-gradient(135deg, #00b894, #00a085);
		color: white;
		box-shadow: 0 8px 32px rgba(0, 184, 148, 0.3);
	}
	
	.form-actions button[type="submit"]:hover {
		transform: translateY(-2px);
		box-shadow: 0 12px 40px rgba(0, 184, 148, 0.4);
	}
	
	.form-actions button[type="button"] {
		background: rgba(108, 117, 125, 0.3);
		color: #fff;
		border: 1px solid rgba(255, 255, 255, 0.2);
	}
	
	.form-actions button[type="button"]:hover {
		background: rgba(108, 117, 125, 0.5);
		transform: translateY(-1px);
	}
	
	.form-actions button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		transform: none !important;
	}
	
	.loading {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 4rem;
		gap: 2rem;
	}
	
	.spinner {
		width: 50px;
		height: 50px;
		border: 3px solid rgba(78, 205, 196, 0.3);
		border-top: 3px solid #4ecdc4;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}
	
	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}
	
	.category-section {
		margin-bottom: 4rem;
	}
	
	.category-section h2 {
		font-size: 2.2rem;
		font-weight: 600;
		background: linear-gradient(135deg, #4ecdc4, #44a08d);
		background-clip: text;
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		border-bottom: 3px solid;
		border-image: linear-gradient(135deg, #4ecdc4, #44a08d) 1;
		padding-bottom: 1rem;
		margin-bottom: 2rem;
		position: relative;
	}
	
	.category-header {
		display: flex;
		align-items: center;
		gap: 1rem;
		cursor: pointer;
		user-select: none;
		transition: all 0.3s ease;
		padding: 0.5rem;
		border-radius: 8px;
	}
	
	.category-toggle {
		font-size: 1.2rem;
		transition: color 0.3s ease;
		color: #4ecdc4;
	}
	
	.category-count {
		font-size: 1rem;
		opacity: 0.7;
		font-weight: 400;
	}
	
	.category-section h2::after {
		content: '';
		position: absolute;
		bottom: -3px;
		left: 0;
		width: 60px;
		height: 3px;
		background: linear-gradient(135deg, #ff6b6b, #ee5a24);
		border-radius: 2px;
	}
	
	.bookmark-grid {
		display: grid;
		gap: 1rem;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
	}
	
	.bookmark-card {
		background: rgba(30, 30, 30, 0.6);
		backdrop-filter: blur(20px);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		cursor: pointer;
		position: relative;
		overflow: hidden;
		height: auto;
		min-height: 50px;
	}
	
	.bookmark-card.expanded {
		height: auto;
	}
	
	.bookmark-compact {
		padding: 0.75rem;
		position: relative;
		display: flex;
		align-items: center;
		gap: 1rem;
	}
	
	.bookmark-expanded {
		padding: 0 0.75rem 0.75rem 0.75rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(20, 20, 20, 0.3);
		animation: expandIn 0.3s ease-out;
	}
	
	@keyframes expandIn {
		from {
			opacity: 0;
			max-height: 0;
			padding-top: 0;
			padding-bottom: 0;
		}
		to {
			opacity: 1;
			max-height: 200px;
			padding-top: 0.75rem;
			padding-bottom: 0.75rem;
		}
	}
	
	.bookmark-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex: 1;
	}
	
	.site-logo-container {
		position: relative;
		width: 20px;
		height: 20px;
		flex-shrink: 0;
	}
	
	.site-logo {
		width: 20px;
		height: 20px;
		border-radius: 4px;
		background: rgba(255, 255, 255, 0.1);
	}
	
	.site-logo-fallback {
		position: absolute;
		top: 0;
		left: 0;
		width: 20px;
		height: 20px;
		border-radius: 4px;
		background: rgba(78, 205, 196, 0.3);
		color: #4ecdc4;
		font-size: 0.7rem;
		font-weight: 600;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	
	.bookmark-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		opacity: 0;
		transition: opacity 0.3s ease;
	}
	
	.bookmark-card:hover .bookmark-actions {
		opacity: 1;
	}
	
	.action-btn {
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 6px;
		width: 24px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.3s ease;
		font-size: 0.7rem;
	}
	
	.edit-btn:hover {
		background: rgba(255, 193, 7, 0.3);
		border-color: rgba(255, 193, 7, 0.5);
	}
	
	.delete-btn:hover {
		background: rgba(220, 53, 69, 0.3);
		border-color: rgba(220, 53, 69, 0.5);
	}
	
	.expand-btn {
		background: rgba(78, 205, 196, 0.2);
		border: 1px solid rgba(78, 205, 196, 0.3);
		border-radius: 6px;
		width: 20px;
		height: 20px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.3s ease;
	}
	
	.expand-btn:hover {
		background: rgba(78, 205, 196, 0.4);
		border-color: rgba(78, 205, 196, 0.6);
		transform: scale(1.1);
	}
	
	.expand-icon {
		font-size: 0.6rem;
		color: #4ecdc4;
		transition: transform 0.3s ease;
		line-height: 1;
	}
	
	.expand-icon.expanded {
		transform: rotate(90deg);
	}
	
	.bookmark-card::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 3px;
		background: linear-gradient(135deg, #ff6b6b, #4ecdc4, #45b7d1);
		opacity: 0;
		transition: opacity 0.3s ease;
	}
	
	.bookmark-card:hover::before {
		opacity: 1;
	}
	
	.bookmark-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
		border-color: rgba(78, 205, 196, 0.3);
		background: rgba(40, 40, 40, 0.8);
	}
	
	.bookmark-info {
		flex: 1;
		min-width: 0;
	}
	
	.bookmark-card h3 {
		margin: 0 0 0.15rem 0;
		color: #fff;
		font-size: 0.9rem;
		font-weight: 600;
		line-height: 1.2;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	
	.bookmark-card a {
		color: #4ecdc4;
		text-decoration: none;
		font-size: 0.75rem;
		display: block;
		transition: color 0.3s ease;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		opacity: 0.8;
	}
	
	.bookmark-card a:hover {
		color: #ff6b6b;
		text-shadow: 0 0 10px rgba(255, 107, 107, 0.5);
		opacity: 1;
	}
	
	.bookmark-description {
		color: rgba(255, 255, 255, 0.8);
		font-size: 0.8rem;
		margin: 0;
		line-height: 1.4;
		padding-top: 0.5rem;
	}
	
	.error {
		color: #ff6b6b;
		font-weight: 600;
		font-size: 1.2rem;
		text-align: center;
		padding: 2rem;
		background: rgba(255, 107, 107, 0.1);
		border: 1px solid rgba(255, 107, 107, 0.3);
		border-radius: 12px;
		margin: 2rem 0;
	}
	
	/* Loading state */
	p {
		font-size: 1.2rem;
		text-align: center;
		color: rgba(255, 255, 255, 0.7);
		padding: 3rem;
	}
	
	/* Responsive design */
	@media (max-width: 768px) {
		main {
			padding: 2rem 1rem;
		}
		
		header {
			flex-direction: column;
			gap: 2rem;
			text-align: center;
		}
		
		h1 {
			font-size: 2.5rem;
		}
		
		.actions {
			justify-content: center;
		}
		
		.bookmark-grid {
			grid-template-columns: 1fr;
		}
		
		.form-container {
			padding: 2rem;
		}
		
		.form-actions {
			flex-direction: column;
		}
		
		.bookmark-actions {
			opacity: 1;
		}
	}
</style>