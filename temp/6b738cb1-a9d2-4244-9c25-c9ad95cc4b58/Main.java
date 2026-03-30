import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        // Code here

        double a = sc.nextDouble();
        int b = sc.nextDouble();
        double c = sc.nextDouble()

        double tbc = (a + b + c) / 3;

        System.out.printf("%.2f", tbc);
    }
}