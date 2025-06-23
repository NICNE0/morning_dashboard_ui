<!-- src/routes/+layout.svelte -->
<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';

	let { children, data } = $props();
	
	// Check if we're on auth pages
	const isAuthPage = $derived($page.url.pathname === '/login' || $page.url.pathname === '/register');
</script>

{#if !isAuthPage && data?.user}
	<nav class="main-nav">
		<div class="nav-content">
			<div class="nav-brand">
				<!-- <span class="nav-icon">📚</span> -->
				<!-- <span class="nav-title">Bookmark Manager</span> -->
			</div>
			
			<div class="nav-user">
				<span class="user-info">Welcome, {data.user.username}!</span>
				<a href="/logout" class="logout-btn">Logout</a>
			</div>
		</div>
	</nav>
{/if}

{@render children()}

<style>
	.main-nav {
		top: 0;
		z-index: 1000;
		padding: 1rem 0;
	}

	.nav-content {
		max-width: 1400px;
		margin: 0 auto;
		/* padding: 0 2rem; */
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.nav-brand {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.nav-user {
		display: flex;
		align-items: center;
		gap: 1rem;
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
		.nav-content {
			padding: 0 1rem;
		}
		
		.nav-user {
			flex-direction: column;
			gap: 0.5rem;
			align-items: flex-end;
		}
		
		.user-info {
			font-size: 0.8rem;
		}
	}
</style>