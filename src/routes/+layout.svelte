<!-- src/routes/+layout.svelte -->
<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';

	let { children, data } = $props();
	
	// Check if we're on auth pages
	const isAuthPage = $derived($page.url.pathname === '/login' || $page.url.pathname === '/register');
</script>

{#if !isAuthPage}
	<div class="top-user-bar">
		{#if data?.user}
			<span class="user-info">Welcome, {data.user.username}!</span>
		{/if}
		<a href="/logout" class="logout-btn">Logout</a>
	</div>
{/if}

{@render children()}

<style>
	/* Reset any conflicting global styles when logged in */
	:global(body) {
		background: linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%);
		color: #e0e0e0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
		margin: 0;
		min-height: 100vh;
		/* Remove any flex centering that might be applied by auth pages */
		display: block !important;
		align-items: initial !important;
		justify-content: initial !important;
	}

	.top-user-bar {
		display: flex;
		justify-content: flex-end;
		align-items: center;
		gap: 1rem;
		padding: 1rem 2rem;
		max-width: 1400px;
		margin: 0 auto;
	}

	.user-info {
		color: rgba(255, 255, 255, 0.8);
		font-size: 0.9rem;
	}

	.logout-btn {
		padding: 0.5rem 1rem;
		background: rgba(231, 76, 60, 0.2);
		border: 1px solid rgba(231, 76, 60, 0.4);
		color: #e74c3c;
		text-decoration: none;
		border-radius: 8px;
		font-size: 0.85rem;
		font-weight: 500;
		transition: all 0.3s ease;
	}

	.logout-btn:hover {
		background: rgba(231, 76, 60, 0.3);
		transform: translateY(-1px);
	}

	@media (max-width: 768px) {
		.top-user-bar {
			padding: 1rem;
			flex-direction: column;
			gap: 0.5rem;
			align-items: flex-end;
		}
		
		.user-info {
			font-size: 0.8rem;
		}
	}
</style>