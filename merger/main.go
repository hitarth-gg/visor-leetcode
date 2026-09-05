package main

import "os"

func main() {
	if len(os.Args) > 1 && os.Args[1] == "--ci" {
		scrapeGithubMain()
		scrapeTagsMain()
		supabaseSyncMain()
		return
	}
	supabaseSyncMain() // go run main.go supabase_sync.go
}
