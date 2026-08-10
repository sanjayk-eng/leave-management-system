// // package main

// // import (
// // 	"fmt"
// // )

// // func FindNum(num int, arr [6]int, start, end int) int {
// // 	if end < start {
// // 		return -1
// // 	}

// // 	mid := (start + end) / 2

// // 	if arr[mid] == num {
// // 		return mid
// // 	}

// // 	if arr[mid] < num {
// // 		start = mid + 1
// // 	} else {
// // 		end = mid - 1
// // 	}

// // 	return FindNum(num, arr, start, end)
// // }

// // func main() {
// // 	arr := [6]int{-1, 3, 4, 10, 12, 16}
// // 	num := -1

// // 	a := FindNum(num, arr, 0, len(arr)-1)

// // 	if a == -1 {
// // 		fmt.Println("Number not found")
// // 	} else {
// // 		fmt.Println("Your number lies at index:", a)
// // 	}
// // }

// package main

// import (
// 	"fmt"
// )

// func FindNum(arr [8]int, start, end int) int {
// 	if end < start {
// 		return -1
// 	}

// 	mid := (start + end) / 2

// 	if arr[mid] > arr[mid -1] && arr[mid] > arr[mid +1] {
// 		return mid
// 	}

// 	if arr[mid] < arr[mid +1] && arr[mid]> arr[mid-1] {
// 		start = mid + 1
// 	} else {
// 		end = mid - 1
// 	}

// 	return FindNum(arr, start, end)
// }

// func main() {
// 	arr := [8]int{-1, 3, 4, 6, 12, 11 ,10 ,8}

// 	a := FindNum( arr, 0, len(arr)-1)

// 	if a == -1 {
// 		fmt.Println("peack element not found")
// 	} else {
// 		fmt.Println("pick element  lies at index:", a)
// 	}
// }

// package main
// import("fmt")

// func FindLow(arr []int , low , high int) int{
// 	if (low == high) {return low}

// 	mid := (low + high)/2;

// 	if (arr[mid] >arr[mid +1]) {
// 		return FindLow(arr , mid +1 , high)
// 	}
// 	return FindLow(arr , low , mid)
// }

// func main(){
// 	var arr = []int{10,8,7,5,9,11,15,17}

// 	fmt.Println("============")

// 	a :=FindLow(arr , 0 , len(arr)-1)

// 	fmt.Printf("Index: %d, Value: %d\n", a, arr[a])

// }

// package main

// import "fmt"

// func GetFirstOccurrence(arr []int, target, low, high int) int {
// 	result := -1
// 	for low <= high {
// 		mid := low + (high-low)/2
// 		if arr[mid] == target {
// 			result = mid
// 			high = mid - 1
// 		} else if arr[mid] < target {
// 			low = mid + 1
// 		} else {
// 			high = mid - 1
// 		}
// 	}
// 	return result
// }

// func GetLastAccurance(arr []int, target, low, high int) int {
// 	result := -1
// 	for low <= high {
// 		mid := low + (high-low)/2
// 		if arr[mid] == target {
// 			result = mid
// 			low = mid + 1
// 		} else if arr[mid] < target {
// 			low = mid + 1
// 		} else {
// 			high = mid - 1
// 		}
// 	}
// 	return result
// }

// func GetAccurance(arr []int, target, low, high int) int {
// 	first := GetFirstOccurrence(arr, target, low, high)
// 	if first == -1 {
// 		return 0
// 	}
// 	last := GetLastAccurance(arr, target, low, high)
// 	return last - first + 1
// }

// func main() {
// 	arr := []int{0, 1, 2, 2 ,2,2,2, 3}
// 	target := 2

// 	fmt.Println("code run")
// 	fmt.Printf("get accurance %d\n", GetAccurance(arr, target, 0, len(arr)-1))
// }

package main

import "fmt"

func main() {
	a := 100

	low := 0
	high := a
	ans := -1

	fmt.Println("Run Code")

	for low <= high {
		mid := (low + high) / 2

		if mid*mid == a {
			ans = mid
			break
		} else if mid*mid < a {
			ans = mid
			low = mid + 1
		} else {
			high = mid - 1
		}
	}

	if ans*ans == a {
		fmt.Printf("true")
	} else {
		fmt.Printf("false")
	}
}
