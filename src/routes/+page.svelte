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

	onMount(async () => {
		try {
			// Fetch bookmarks
			const bookmarksResponse = await fetch('/api/bookmarks');
			if (!bookmarksResponse.ok) throw new Error('Failed to fetch bookmarks');
			bookmarksByCategory = await bookmarksResponse.json();
			
			// Fetch categories for the sidebar
			const categoriesResponse = await fetch('/api/categories');
			if (!categoriesResponse.ok) throw new Error('Failed to fetch categories');
			categories = await categoriesResponse.json();
			
			loading = false;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Unknown error';
			loading = false;
		}
	});
</script>

<svelte:head>
	<title>Bookmark Manager</title>
</svelte:head>

<main>
	<h1>My Bookmark Manager</h1>
	
	{#if loading}
		<p>Loading bookmarks...</p>
	{:else if error}
		<p class="error">Error: {error}</p>
	{:else}
		<div class="bookmark-container">
			{#each Object.entries(bookmarksByCategory) as [categoryName, sites]}
				{#if sites.length > 0}
					<section class="category-section">
						<h2>{categoryName}</h2>
						<div class="bookmark-grid">
							{#each sites as site}
								<div class="bookmark-card">
									<h3>{site.name}</h3>
									<a href={site.url} target="_blank" rel="noopener noreferrer">
										{site.url}
									</a>
									{#if site.description}
										<p>{site.description}</p>
									{/if}
								</div>
							{/each}
						</div>
					</section>
				{/if}
			{/each}
		</div>
	{/if}
</main>

<style>
	main {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
	}
	
	h1 {
		color: #ff3e00;
		margin-bottom: 2rem;
	}
	
	.category-section {
		margin-bottom: 3rem;
	}
	
	.category-section h2 {
		color: #0066cc;
		border-bottom: 2px solid #0066cc;
		padding-bottom: 0.5rem;
		margin-bottom: 1rem;
	}
	
	.bookmark-grid {
		display: grid;
		gap: 1rem;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
	}
	
	.bookmark-card {
		border: 1px solid #ddd;
		border-radius: 8px;
		padding: 1rem;
		background: white;
		box-shadow: 0 2px 4px rgba(0,0,0,0.1);
		transition: transform 0.2s;
	}
	
	.bookmark-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 8px rgba(0,0,0,0.15);
	}
	
	.bookmark-card h3 {
		margin: 0 0 0.5rem 0;
		color: #333;
	}
	
	.bookmark-card a {
		color: #0066cc;
		text-decoration: none;
		font-size: 0.9rem;
		display: block;
		margin-bottom: 0.5rem;
	}
	
	.bookmark-card a:hover {
		text-decoration: underline;
	}
	
	.bookmark-card p {
		color: #666;
		font-size: 0.9rem;
		margin: 0;
	}
	
	.error {
		color: red;
		font-weight: bold;
	}
</style>