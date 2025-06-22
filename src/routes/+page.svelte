<script lang="ts">
	import { onMount } from 'svelte';
	
	interface Site {
		id: number;
		name: string;
		description: string | null;
		url: string;
		categoryId: number;
		languageId?: number | null;
		createdAt: Date;
		language?: {
			id: number;
			name: string;
			shortName: string;
		} | null;
		tags: Tag[];
	}
	
	interface Category {
		id: number;
		name: string;
		description: string | null;
	}
	
	interface Language {
		id: number;
		name: string;
		shortName: string;
	}
	
	interface Tag {
		id: number;
		name: string;
		count?: number;
	}
	
	let bookmarksByCategory: Record<string, Site[]> = {};
	let categories: Category[] = [];
	let languages: Language[] = [];
	let tags: Tag[] = [];
	let loading = true;
	let error = '';
	
	// Form states
	let showCategoryForm = false;
	let showSiteForm = false;
	let categoryForm = { name: '', description: '' };
	let siteForm = { 
		name: '', 
		url: '', 
		description: '', 
		categoryId: '', 
		languageId: '',
		tags: [] as string[]
	};
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
	
	// Category expand all state
	let expandAllInCategory: Record<string, boolean> = {};
	
	// Tag input states
	let newTagInput = '';
	let showTagSuggestions = false;
	let filteredTags: Tag[] = [];
	let editNewTagInput = '';
	let editShowTagSuggestions = false;
	let editFilteredTags: Tag[] = [];
	
	function toggleExpandAllInCategory(categoryName: string, sites: Site[]) {
		const currentState = expandAllInCategory[categoryName] || false;
		const newState = !currentState;
		
		expandAllInCategory[categoryName] = newState;
		expandAllInCategory = { ...expandAllInCategory };
		
		// Update all cards in this category
		sites.forEach(site => {
			if (site.description) { // Only expand cards that have descriptions
				expandedCards[site.id] = newState;
			}
		});
		expandedCards = { ...expandedCards };
	}
	
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
		editingBookmark = { 
			...bookmark,
			languageId: bookmark.languageId || null
		};
		showEditForm = true;
	}
	
	function cancelEdit() {
		editingBookmark = null;
		showEditForm = false;
		editNewTagInput = '';
		editShowTagSuggestions = false;
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
				categoryName.toLowerCase().includes(lowercaseQuery) ||
				site.language?.name.toLowerCase().includes(lowercaseQuery) ||
				site.tags.some(tag => tag.name.toLowerCase().includes(lowercaseQuery))
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
	
	// Tag management functions
	function filterTagSuggestions(input: string) {
		if (!input.trim()) {
			filteredTags = [];
			return;
		}
		
		const lowercaseInput = input.toLowerCase();
		filteredTags = tags.filter(tag => 
			tag.name.toLowerCase().includes(lowercaseInput) &&
			!siteForm.tags.includes(tag.id.toString())
		).slice(0, 10);
	}
	
	function filterEditTagSuggestions(input: string) {
		if (!input.trim()) {
			editFilteredTags = [];
			return;
		}
		
		const lowercaseInput = input.toLowerCase();
		const currentEditTags = editingBookmark?.tags.map(t => t.id.toString()) || [];
		editFilteredTags = tags.filter(tag => 
			tag.name.toLowerCase().includes(lowercaseInput) &&
			!currentEditTags.includes(tag.id.toString())
		).slice(0, 10);
	}
	
	async function addTag(tagName: string, isEdit = false) {
		const trimmedName = tagName.trim().toLowerCase();
		if (!trimmedName) return;
		
		// Check if tag already exists
		let existingTag = tags.find(tag => tag.name.toLowerCase() === trimmedName);
		
		if (!existingTag) {
			// Create new tag
			try {
				const response = await fetch('/api/tags', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ name: trimmedName })
				});
				
				if (response.ok) {
					existingTag = await response.json();
					tags = [...tags, existingTag];
				} else {
					throw new Error('Failed to create tag');
				}
			} catch (err) {
				showToastNotification('Failed to create tag', 'error');
				return;
			}
		}
		
		// Add to form
		if (isEdit && editingBookmark) {
			if (!editingBookmark.tags.some(t => t.id === existingTag.id)) {
				editingBookmark.tags = [...editingBookmark.tags, existingTag];
				editingBookmark = { ...editingBookmark };
			}
			editNewTagInput = '';
			editShowTagSuggestions = false;
		} else {
			if (!siteForm.tags.includes(existingTag.id.toString())) {
				siteForm.tags = [...siteForm.tags, existingTag.id.toString()];
			}
			newTagInput = '';
			showTagSuggestions = false;
		}
	}
	
	function removeTag(tagId: string, isEdit = false) {
		if (isEdit && editingBookmark) {
			editingBookmark.tags = editingBookmark.tags.filter(t => t.id.toString() !== tagId);
			editingBookmark = { ...editingBookmark };
		} else {
			siteForm.tags = siteForm.tags.filter(id => id !== tagId);
		}
	}
	
	function getTagName(tagId: string): string {
		const tag = tags.find(t => t.id.toString() === tagId);
		return tag ? tag.name : 'Unknown';
	}

	onMount(() => {
		loadData();
	});

	async function loadData() {
		try {
			loading = true;
			
			// Fetch all data in parallel
			const [bookmarksResponse, categoriesResponse, languagesResponse, tagsResponse] = await Promise.all([
				fetch('/api/bookmarks'),
				fetch('/api/categories'),
				fetch('/api/languages'),
				fetch('/api/tags')
			]);
			
			if (!bookmarksResponse.ok) throw new Error('Failed to fetch bookmarks');
			if (!categoriesResponse.ok) throw new Error('Failed to fetch categories');
			if (!languagesResponse.ok) throw new Error('Failed to fetch languages');
			if (!tagsResponse.ok) throw new Error('Failed to fetch tags');
			
			bookmarksByCategory = await bookmarksResponse.json();
			categories = await categoriesResponse.json();
			languages = await languagesResponse.json();
			tags = await tagsResponse.json();
			
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
			const payload = {
				name: siteForm.name,
				url: siteForm.url,
				description: siteForm.description,
				categoryId: siteForm.categoryId,
				languageId: siteForm.languageId || null,
				tagIds: siteForm.tags.map(id => parseInt(id))
			};
			
			const response = await fetch('/api/bookmarks', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to create bookmark');
			}

			// Reset form and reload data
			siteForm = { name: '', url: '', description: '', categoryId: '', languageId: '', tags: [] };
			newTagInput = '';
			showTagSuggestions = false;
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
			const payload = {
				name: editingBookmark.name,
				url: editingBookmark.url,
				description: editingBookmark.description,
				categoryId: editingBookmark.categoryId,
				languageId: editingBookmark.languageId || null,
				tagIds: editingBookmark.tags.map(t => t.id)
			};
			
			const response = await fetch(`/api/bookmarks/${editingBookmark.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
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
	
	// Reactive statements for tag filtering
	$: filterTagSuggestions(newTagInput);
	$: filterEditTagSuggestions(editNewTagInput);
</script>

<svelte:head>
	<title>Bookmark Manager</title>
</svelte:head>

<main>
	<header>
		<h1><span class="title-icon">📚</span> <span class="title-text">My Bookmark Manager</span></h1>
		<div class="divider"></div>
	</header>

	<!-- Search and Actions Bar -->
	<div class="search-actions-container">
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
		<div class="actions">
			<button on:click={() => showCategoryForm = !showCategoryForm} class="btn btn-secondary">
				✨ Add Category
			</button>
			<button on:click={() => showSiteForm = !showSiteForm} class="btn btn-primary">
				🔖 Add Bookmark
			</button>
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
				
				<select bind:value={siteForm.languageId}>
					<option value="">Select a language (optional)</option>
					{#each languages as language}
						<option value={language.id}>{language.name} ({language.shortName})</option>
					{/each}
				</select>
				
				<input
					bind:value={siteForm.description}
					placeholder="Description (optional)"
				/>
				
				<!-- Tags Section -->
				<div class="tags-section">
					<label class="tags-label">Tags:</label>
					
					<!-- Selected Tags -->
					{#if siteForm.tags.length > 0}
						<div class="selected-tags">
							{#each siteForm.tags as tagId}
								<span class="tag-chip">
									{getTagName(tagId)}
									<button type="button" class="tag-remove" on:click={() => removeTag(tagId)}>×</button>
								</span>
							{/each}
						</div>
					{/if}
					
					<!-- Tag Input -->
					<div class="tag-input-container">
						<input
							bind:value={newTagInput}
							placeholder="Add tags..."
							class="tag-input"
							on:focus={() => showTagSuggestions = true}
							on:blur={() => setTimeout(() => showTagSuggestions = false, 200)}
							on:keydown={(e) => {
								if (e.key === 'Enter') {
									e.preventDefault();
									addTag(newTagInput);
								}
							}}
						/>
						
						{#if newTagInput.trim()}
							<button 
								type="button" 
								class="add-tag-btn"
								on:click={() => addTag(newTagInput)}
							>
								Add "{newTagInput}"
							</button>
						{/if}
						
						<!-- Tag Suggestions -->
						{#if showTagSuggestions && filteredTags.length > 0}
							<div class="tag-suggestions">
								{#each filteredTags as tag}
									<button 
										type="button" 
										class="tag-suggestion"
										on:click={() => addTag(tag.name)}
									>
										{tag.name}
									</button>
								{/each}
							</div>
						{/if}
					</div>
				</div>
				
				<div class="form-actions">
					<button type="submit" disabled={submitting || !siteForm.name.trim() || !siteForm.url.trim() || !siteForm.categoryId}>
						{submitting ? 'Creating...' : 'Create Bookmark'}
					</button>
					<button type="button" on:click={() => {
						showSiteForm = false;
						siteForm = { name: '', url: '', description: '', categoryId: '', languageId: '', tags: [] };
						newTagInput = '';
						showTagSuggestions = false;
					}}>Cancel</button>
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
				
				<select bind:value={editingBookmark.languageId}>
					<option value="">Select a language (optional)</option>
					{#each languages as language}
						<option value={language.id}>{language.name} ({language.shortName})</option>
					{/each}
				</select>
				
				<input
					bind:value={editingBookmark.description}
					placeholder="Description (optional)"
				/>
				
				<!-- Edit Tags Section -->
				<div class="tags-section">
					<label class="tags-label">Tags:</label>
					
					<!-- Selected Tags -->
					{#if editingBookmark.tags.length > 0}
						<div class="selected-tags">
							{#each editingBookmark.tags as tag}
								<span class="tag-chip">
									{tag.name}
									<button type="button" class="tag-remove" on:click={() => removeTag(tag.id.toString(), true)}>×</button>
								</span>
							{/each}
						</div>
					{/if}
					
					<!-- Tag Input -->
					<div class="tag-input-container">
						<input
							bind:value={editNewTagInput}
							placeholder="Add tags..."
							class="tag-input"
							on:focus={() => editShowTagSuggestions = true}
							on:blur={() => setTimeout(() => editShowTagSuggestions = false, 200)}
							on:keydown={(e) => {
								if (e.key === 'Enter') {
									e.preventDefault();
									addTag(editNewTagInput, true);
								}
							}}
						/>
						
						{#if editNewTagInput.trim()}
							<button 
								type="button" 
								class="add-tag-btn"
								on:click={() => addTag(editNewTagInput, true)}
							>
								Add "{editNewTagInput}"
							</button>
						{/if}
						
						<!-- Tag Suggestions -->
						{#if editShowTagSuggestions && editFilteredTags.length > 0}
							<div class="tag-suggestions">
								{#each editFilteredTags as tag}
									<button 
										type="button" 
										class="tag-suggestion"
										on:click={() => addTag(tag.name, true)}
									>
										{tag.name}
									</button>
								{/each}
							</div>
						{/if}
					</div>
				</div>
				
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
						<div class="category-header-container">
							<button class="category-header" on:click={() => toggleCategory(categoryName)} type="button">
								<span class="category-toggle" class:collapsed={collapsedCategories[categoryName]}>
									{collapsedCategories[categoryName] ? '▶' : '▼'}
								</span>
								{categoryName}
								<span class="category-count">({sites.length})</span>
							</button>
							
							{#if sites.some(site => site.description)}
								<div class="category-expand-all">
									<label class="expand-all-checkbox">
										<input 
											type="checkbox" 
											checked={expandAllInCategory[categoryName] || false}
											on:change={() => toggleExpandAllInCategory(categoryName, sites)}
										/>
										<span class="checkbox-label">Expand all</span>
									</label>
								</div>
							{/if}
						</div>
						
						{#if !collapsedCategories[categoryName]}
							<div class="bookmark-grid">
								{#each sites as site}
									<div class="bookmark-card" class:has-expanded-description={site.description && expandedCards[site.id]}>
										<div class="bookmark-compact" on:click={() => window.open(site.url, '_blank')} role="button" tabindex="0" on:keydown={(e) => e.key === 'Enter' && window.open(site.url, '_blank')}>
											<div class="bookmark-header">
												<div class="site-logo-container">
													<img 
														src={getFaviconUrl(site.url)} 
														alt="{site.name} logo" 
														class="site-logo"
														on:error={(e) => {
															const target = e.currentTarget;
															if (target instanceof HTMLImageElement) {
																const fallback = target.nextElementSibling;
																if (fallback instanceof HTMLElement) {
																	target.style.display = 'none';
																	fallback.style.display = 'flex';
																}
															}
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
													{#if site.language}
														<span class="language-badge">{site.language.shortName}</span>
													{/if}
												</div>
											</div>
											
											<div class="bookmark-actions">
												<button 
													class="action-btn edit-btn" 
													on:click={(e) => startEditBookmark(site, e)}
													title="Edit bookmark"
													type="button"
												>
													✏️
												</button>
												<button 
													class="action-btn delete-btn" 
													on:click={(e) => deleteBookmark(site.id, e)}
													title="Delete bookmark"
													type="button"
												>
													🗑️
												</button>
												{#if site.description}
													<button 
														class="expand-btn" 
														on:click={(e) => toggleCard(site.id, e)}
														title={expandedCards[site.id] ? 'Collapse' : 'Expand'}
														type="button"
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
										
										{#if site.tags.length > 0}
											<div class="bookmark-tags">
												{#each site.tags as tag}
													<span class="bookmark-tag">{tag.name}</span>
												{/each}
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
		flex-direction: column;
		margin-bottom: 2rem;
		padding: 2rem 0 0 0;
	}
	
	.divider {
		width: 100%;
		height: 1px;
		background: #333;
		margin-top: 2rem;
	}
	
	/* Search and Actions Bar */
	.search-actions-container {
		display: flex;
		align-items: center;
		gap: 2rem;
		margin-bottom: 3rem;
		flex-wrap: wrap;
	}
	
	.search-input-wrapper {
		position: relative;
		flex: 1;
		min-width: 300px;
	}
	
	/* Title Styling */
	.title-icon {
		color: #ff6b6b;
	}
	
	.title-text {
		color: #4ecdc4;
	}
	
	/* Category Header Container */
	.category-header-container {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
		position: relative;
	}
	
	.category-expand-all {
		opacity: 0;
		transition: opacity 0.3s ease;
		position: absolute;
		right: 0;
	}
	
	.category-header-container:hover .category-expand-all {
		opacity: 1;
	}
	
	.expand-all-checkbox {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
		font-size: 0.9rem;
		color: rgba(255, 255, 255, 0.7);
		transition: color 0.3s ease;
		white-space: nowrap;
	}
	
	.expand-all-checkbox:hover {
		color: #4ecdc4;
	}
	
	.expand-all-checkbox input[type="checkbox"] {
		accent-color: #4ecdc4;
		width: 16px;
		height: 16px;
	}
	
	.checkbox-label {
		user-select: none;
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
	}
	
	.btn-secondary {
		background: linear-gradient(135deg, #4ecdc4, #44a08d);
		color: white;
	}
	
	.btn:hover {
		transform: translateY(-2px);
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
	}
	
	.form-actions button[type="submit"]:hover {
		transform: translateY(-2px);
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

	.category-header-container::after {
		content: '';
		position: absolute;
		bottom: -3px;
		left: 0;
		right: 120px;
		height: 3px;
		background: #4ecdc4;
		border-radius: 2px;
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
		background: none;
		border: none;
		font-size: 2.2rem;
		font-weight: 600;
		background: linear-gradient(135deg, #4ecdc4, #44a08d);
		background-clip: text;
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		margin: 0;
		text-align: left;
		width: auto;
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
	
	.bookmark-grid {
		display: grid;
		gap: 1rem;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		align-items: start;
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
	
	.bookmark-compact {
		padding: 0.75rem;
		position: relative;
		display: flex;
		align-items: center;
		gap: 1rem;
		width: 100%;
		cursor: pointer;
	}
	
	.bookmark-compact:focus {
		outline: 2px solid #4ecdc4;
		outline-offset: 2px;
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

  /* Tags Input Styles */
  .tags-section {
    margin-top: 1rem;
  }

  .selected-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .tag-chip {
    background-color: #4ecdc4;
    color: #fff;
    padding: 0.3rem 0.7rem;
    border-radius: 12px;
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.85rem;
  }

  .tag-remove {
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    font-size: 1rem;
  }

  .tag-input-container {
    position: relative;
  }

  .tag-input {
    width: 50%;
    padding: 0.6rem 1rem;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.2);
    background-color: rgba(255,255,255,0.05);
    color: #fff;
  }

  .tag-input:focus {
    outline: none;
    border-color: #4ecdc4;
    box-shadow: 0 0 5px rgba(78,205,196,0.3);
  }

  .tag-suggestions {
    position: absolute;
    width: 50%;
    background-color: rgb(30, 30, 30);
    border-radius: 8px;
    box-shadow: 0 4px 10px rgba(0,0,0,0.5);
    z-index: 100;
    max-height: 200px;
    overflow-y: auto;
    margin-top: 0.3rem;
  }

  .tag-suggestion {
    padding: 0.5rem 0.8rem;
    cursor: pointer;
    background: none;
    color: #e0e0e0;
    border: none;
    width: 100%;
    text-align: left;
  }

  .tag-suggestion:hover {
    background-color: rgba(78,205,196,0.2);
  }

  .add-tag-btn {
    background-color: rgba(78, 205, 196, 0.9);
    color: white;
    border: none;
    border-radius: 8px;
    padding: 0.5rem 0.8rem;
    cursor: pointer;
    font-size: 0.85rem;
    margin-top: 0.3rem;
    width: 50%;
    text-align: left;
    transition: background-color 0.2s ease;
  }

  .add-tag-btn:hover {
    background-color: rgba(78, 205, 196, 1);
  }

  /* Language Dropdown Styles */
  select {
    width: 100%;
    padding: 0.7rem 1rem;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.2);
    background-color: rgba(255,255,255,0.05);
    color: #fff;
    appearance: none;
    background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' fill='%23fff'%3E%3Cpolygon points='0,0 20,0 10,10'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 0.7rem center;
    background-size: 10px;
  }

  select:focus {
    outline: none;
    border-color: #4ecdc4;
    box-shadow: 0 0 5px rgba(78,205,196,0.3);
  }

  option {
    background-color: #1a1a1a;
    color: #fff;
  }

	
	/* Responsive design */
	@media (max-width: 768px) {
		main {
			padding: 2rem 1rem;
		}
		
		h1 {
			font-size: 2.5rem;
		}
		
		.search-actions-container {
			flex-direction: column;
			gap: 1.5rem;
		}
		
		.search-input-wrapper {
			min-width: 100%;
		}
		
		.actions {
			justify-content: center;
			width: 100%;
		}
		
		.category-header-container {
			flex-direction: column;
			gap: 1rem;
			align-items: flex-start;
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