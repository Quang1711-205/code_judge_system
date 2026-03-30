import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        // Code here

        long age = sc.nextInt();
        long score = sc.nextInt();
        

        if(age >= 18 && score >= 50) {
            System.out.println("PASS");
        } else {
            System.out.println("FAIL");
        }
    }
}