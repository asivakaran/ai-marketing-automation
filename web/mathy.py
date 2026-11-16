x1 = 0.2
x2 = 0.200001

for i in range (25):
    print(f"Step {i:2d} | x1: {x1:.6f} | x2: {x2:.6f}")
    x1 = 4 * x1 * (1 - x1)
    x2 = 4 * x2 * (1 - x2)

    