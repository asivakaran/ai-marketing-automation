import random
doors = ["goat", "goat", "car"]

attempts = 10
wins= 0 

for i in range(0,attempts):
    random.shuffle(doors)
    
    audience = random.randint(0,2)
    
    goat_doors = []
    for j in range(0,3):
        if doors [j] == "goat":
            goat_doors.append[j]

print(doors)
print(goat_doors)
